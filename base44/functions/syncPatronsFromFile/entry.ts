import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { file_url } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Extract data from the uploaded file
        const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        Email: { type: "string" },
                        "Patron Status": { type: "string" }
                    }
                }
            }
        });

        if (extractResult.status === 'error') {
            return Response.json({ error: extractResult.details }, { status: 500 });
        }

        // Log all patron statuses to debug
        const allStatuses = extractResult.output.map(p => p["Patron Status"]);
        console.log('All unique patron statuses:', [...new Set(allStatuses)]);
        console.log('Total rows in file:', extractResult.output.length);

        // Filter for active patrons - be flexible with status matching
        const activeEmails = extractResult.output
            .filter(p => {
                const status = p["Patron Status"]?.toLowerCase().trim();
                return (status === "active patron" || status === "active_patron" || status === "active") && p.Email;
            })
            .map(p => p.Email.toLowerCase().trim());

        console.log(`Found ${activeEmails.length} active patron emails`);
        console.log('Active patron emails:', activeEmails);

        // Get all users
        const allUsers = await base44.asServiceRole.entities.User.list();
        console.log(`Total users in database: ${allUsers.length}`);

        const userEmails = allUsers.map(u => u.email.toLowerCase().trim());
        console.log('User emails in DB:', userEmails);

        // Check which patron emails are NOT in the database
        const patronsNotInDB = activeEmails.filter(email => !userEmails.includes(email));
        if (patronsNotInDB.length > 0) {
            console.log(`WARNING: ${patronsNotInDB.length} active patrons NOT found in database:`, patronsNotInDB);
        }

        let activated = 0;
        let deactivated = 0;
        let skipped = 0;

        // Update users based on patron status
        for (const dbUser of allUsers) {
            // Skip admins
            if (dbUser.role === 'admin') {
                skipped++;
                continue;
            }

            const userEmail = dbUser.email.toLowerCase().trim();
            const isActivePatron = activeEmails.includes(userEmail);

            const currentStatus = dbUser.membership_status;

            console.log(`User: ${dbUser.email}, isActivePatron: ${isActivePatron}, currentStatus: ${currentStatus}`);

            // Activate if they're an active patron but currently not active
            if (isActivePatron && currentStatus !== 'active') {
                await base44.asServiceRole.entities.User.update(dbUser.id, {
                    membership_status: 'active'
                });
                activated++;
                console.log(`✓ Activated: ${dbUser.email}`);
            }
            // Deactivate if they're not an active patron but currently active
            else if (!isActivePatron && currentStatus === 'active') {
                await base44.asServiceRole.entities.User.update(dbUser.id, {
                    membership_status: 'inactive'
                });
                deactivated++;
                console.log(`✗ Deactivated: ${dbUser.email}`);
            } else {
                console.log(`- No change for: ${dbUser.email}`);
            }
        }

        return Response.json({
            success: true,
            total_patrons: activeEmails.length,
            activated,
            deactivated,
            skipped
        });

    } catch (error) {
        console.error('Error syncing patrons:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});