import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Loader2, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreatePostForm from '../components/admin/CreatePostForm';
import UpdateLivestreamForm from '../components/admin/UpdateLivestreamForm';
import UpdateLocationForm from '../components/admin/UpdateLocationForm';
import AnalyticsCards from '../components/admin/AnalyticsCards';
import ManagePostsList from '../components/admin/ManagePostsList';
import ChatModeration from '../components/admin/ChatModeration';
import ContentModerationTab from '../components/admin/ContentModerationTab';
import UserManagement from '../components/admin/UserManagement';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Admin() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.role !== 'admin') {
        navigate(createPageUrl('Feed'));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: posts = [] } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: () => base44.entities.Post.list('-created_date'),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['admin-comments'],
    queryFn: () => base44.entities.Comment.list(),
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 30000,
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => base44.entities.Post.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const syncPatronsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('syncPatreonMembers', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const syncFromFileMutation = useMutation({
    mutationFn: (file_url) => base44.functions.invoke('syncPatronsFromFile', { file_url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUploadedFile(null);
    },
  });

  const refreshTokenMutation = useMutation({
    mutationFn: () => base44.functions.invoke('refreshPatreonToken', {}),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(result.file_url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const getStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return {
      activeMembers: users.filter(u => u.membership_status === 'active').length,
      postsThisWeek: posts.filter(p => new Date(p.created_date) > oneWeekAgo).length,
      commentsThisWeek: comments.filter(c => new Date(c.created_date) > oneWeekAgo).length,
      totalPosts: posts.length,
    };
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Manage content and view analytics
        </p>
      </div>

      <AnalyticsCards stats={getStats()} />

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="flex flex-row w-full overflow-x-auto bg-muted p-1 sticky top-0 z-10 gap-1 h-auto" style={{ scrollbarWidth: 'none' }}>
          <TabsTrigger value="posts" className="flex-shrink-0">Posts</TabsTrigger>
          <TabsTrigger value="livestream" className="flex-shrink-0">Live</TabsTrigger>

          <TabsTrigger value="manage" className="flex-shrink-0">Manage</TabsTrigger>
          <TabsTrigger value="chat" className="flex-shrink-0">Chat</TabsTrigger>
          <TabsTrigger value="reports" className="flex-shrink-0">Reports</TabsTrigger>
          <TabsTrigger value="users" className="flex-shrink-0">Users</TabsTrigger>
          <TabsTrigger value="sync" className="flex-shrink-0">Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 pb-4">
          <CreatePostForm 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
              queryClient.invalidateQueries({ queryKey: ['posts'] });
            }} 
          />
        </TabsContent>

        <TabsContent value="livestream" className="space-y-4 pb-4">
          <UpdateLivestreamForm 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['livestreams'] });
            }} 
          />
        </TabsContent>

        <TabsContent value="location" className="space-y-4 pb-20">
          <UpdateLocationForm 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['locations'] });
            }} 
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4 pb-4">
          <ManagePostsList 
            posts={posts} 
            onDelete={(id) => deletePostMutation.mutate(id)} 
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4 pb-4">
          <ChatModeration />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 pb-4">
          <ContentModerationTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-4 pb-4">
          {usersLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : usersError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              Error loading users: {usersError.message}
            </div>
          ) : (
            <UserManagement users={users} />
          )}
        </TabsContent>

        <TabsContent value="sync" className="space-y-4 pb-4">
          <div className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Patreon Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300 text-sm">
                  Re-authorize with Patreon to get new access tokens (required every ~30 days).
                </p>
                <Button
                  onClick={async () => {
                    const res = await base44.functions.invoke('patreonOAuthCallback', {});
                    window.open(res.data.oauth_url, '_blank');
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-authorize Patreon
                </Button>
                {refreshTokenMutation.isSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">
                      ✓ Token refreshed successfully!
                    </p>
                  </div>
                )}
                {refreshTokenMutation.isError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      Error: {refreshTokenMutation.error.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Sync from Patreon API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300 text-sm">
                  Sync all active Patreon members using the API. This will activate users who are active patrons and deactivate those who aren't.
                </p>
                <Button
                  onClick={() => syncPatronsMutation.mutate()}
                  disabled={syncPatronsMutation.isPending}
                  className="w-full bg-cyan-500 hover:bg-cyan-400"
                >
                  {syncPatronsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync from API
                    </>
                  )}
                </Button>
                {syncPatronsMutation.isSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">
                      ✓ Synced! {syncPatronsMutation.data.data.activated} activated, {syncPatronsMutation.data.data.deactivated} deactivated
                    </p>
                  </div>
                )}
                {syncPatronsMutation.isError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      Error: {syncPatronsMutation.error.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Sync from Excel File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300 text-sm">
                  Upload an Excel file exported from Patreon or Podia with patron emails. The file should have "Email" and "Patron Status" columns.
                </p>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={uploading || syncFromFileMutation.isPending}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading file...
                    </div>
                  )}
                  {uploadedFile && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-400 text-sm">✓ File uploaded, ready to sync</p>
                    </div>
                  )}
                  <Button
                    onClick={() => syncFromFileMutation.mutate(uploadedFile)}
                    disabled={!uploadedFile || syncFromFileMutation.isPending}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {syncFromFileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing from file...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Sync from File
                      </>
                    )}
                  </Button>
                </div>
                {syncFromFileMutation.isSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">
                      ✓ Synced! {syncFromFileMutation.data.data.activated} activated, {syncFromFileMutation.data.data.deactivated} deactivated from {syncFromFileMutation.data.data.total_patrons} patrons
                    </p>
                  </div>
                )}
                {syncFromFileMutation.isError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      Error: {syncFromFileMutation.error.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
        </div>
        );
        }