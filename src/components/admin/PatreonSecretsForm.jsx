import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function PatreonSecretsForm() {
  const [secrets, setSecrets] = useState({
    PATREON_CLIENT_ID: '',
    PATREON_CLIENT_SECRET: '',
    PATREON_ACCESS_TOKEN: '',
    PATREON_REFRESH_TOKEN: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => {
    setSecrets(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);
    
    try {
      // You'll need to set these through dashboard settings or create a backend function
      // For now, just confirm the values are ready
      console.log('Secrets ready to be set:', secrets);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Patreon Secrets</CardTitle>
        <CardDescription>Enter your Patreon OAuth credentials</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Client ID</label>
          <Input
            placeholder="Your Patreon Client ID"
            value={secrets.PATREON_CLIENT_ID}
            onChange={(e) => handleChange('PATREON_CLIENT_ID', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Client Secret</label>
          <Input
            placeholder="Your Patreon Client Secret"
            type="password"
            value={secrets.PATREON_CLIENT_SECRET}
            onChange={(e) => handleChange('PATREON_CLIENT_SECRET', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Access Token</label>
          <Input
            placeholder="Creator's Access Token"
            type="password"
            value={secrets.PATREON_ACCESS_TOKEN}
            onChange={(e) => handleChange('PATREON_ACCESS_TOKEN', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Refresh Token</label>
          <Input
            placeholder="Creator's Refresh Token"
            type="password"
            value={secrets.PATREON_REFRESH_TOKEN}
            onChange={(e) => handleChange('PATREON_REFRESH_TOKEN', e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
          {success && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready to set!</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 pt-2">
          Note: These secrets need to be set through your app settings dashboard. Copy the values from above and set them there.
        </p>
      </CardContent>
    </Card>
  );
}