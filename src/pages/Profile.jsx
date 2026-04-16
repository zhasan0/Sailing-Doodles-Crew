import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  User, Shield, CheckCircle, XCircle, LogOut, 
  HelpCircle, ExternalLink, Anchor, Loader2, Camera, Edit2,
  Instagram, Twitter, Globe, Bell, Trash2, AlertTriangle, Users
} from 'lucide-react';
import MembershipCard from '@/components/profile/MembershipCard';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifyLivestream, setNotifyLivestream] = useState(false);
  const [notifyNewPosts, setNotifyNewPosts] = useState(false);
  const [notifyForum, setNotifyForum] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(false);
  const [pushLivestream, setPushLivestream] = useState(false);
  const [pushNewPosts, setPushNewPosts] = useState(false);
  const [pushForum, setPushForum] = useState(false);
  const [pushMessages, setPushMessages] = useState(false);
  const [supportEmail, setSupportEmail] = useState('cruise@sailingdoodles.com');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setEditName(userData.display_name || userData.full_name || '');
        setEditBio(userData.bio || '');
        setEditInstagram(userData.instagram || '');
        setEditTwitter(userData.twitter || '');
        setEditWebsite(userData.website || '');
        setNotifyLivestream(userData.notify_livestream ?? true);
        setNotifyNewPosts(userData.notify_new_posts ?? true);
        setNotifyForum(userData.notify_forum ?? true);
        setNotifyMessages(userData.notify_messages ?? true);

        // Load push notification preferences
        const prefs = await base44.entities.NotificationPreference.filter({ user_email: userData.email });
        const prefMap = new Map(prefs.map(p => [p.notification_type, p.push_enabled]));
        setPushLivestream(prefMap.get('livestream') ?? true);
        setPushNewPosts(prefMap.get('new_post') ?? true);
        setPushForum(prefMap.get('thread_reply') ?? true);
        setPushMessages(prefMap.get('new_message') ?? true);

        // Load support email from AppSettings
        const settings = await base44.entities.AppSettings.filter({ key: 'support_email' });
        if (settings.length > 0) {
          setSupportEmail(settings[0].value);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setEditing(false);
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ 
      display_name: editName, 
      bio: editBio,
      instagram: editInstagram,
      twitter: editTwitter,
      website: editWebsite
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: result.file_url });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploadingAvatar(false);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      // Delete the user entity from the database
      await base44.entities.User.delete(user.id);
      // Log out the user
      await base44.auth.logout();
      window.location.href = '/';
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) return null;

  const isActive = user.membership_status === 'active' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {(user.full_name || user.email)[0].toUpperCase()}
              </span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-cyan-400 transition-colors">
            {uploadingAvatar ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white" />
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
            />
          </label>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">
          {user.display_name || user.full_name || user.email.split('@')[0]}
        </h1>
        <p className="text-slate-400 text-sm">{user.email}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          {isAdmin && (
            <Badge className="bg-amber-500/20 text-amber-400 border-0">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          <Badge className={isActive 
            ? "bg-emerald-500/20 text-emerald-400 border-0" 
            : "bg-red-500/20 text-red-400 border-0"
          }>
            {isActive ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Active Member
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </div>

      <MembershipCard user={user} onUserUpdated={async () => {
        const updated = await base44.auth.me();
        setUser(updated);
      }} />

      {/* Account Info */}
      <Card className="bg-slate-900/50 border-slate-800 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Profile Information</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-400 text-sm">Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Bio</Label>
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white mt-1 min-h-[80px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-400 text-sm">Social Links</Label>
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-slate-400" />
                    <Input
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      placeholder="Instagram handle"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-slate-400" />
                    <Input
                      value={editTwitter}
                      onChange={(e) => setEditTwitter(e.target.value)}
                      placeholder="Twitter/X handle"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <Input
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="Website URL"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="w-full bg-cyan-500 hover:bg-cyan-400"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="text-white">{user.display_name || user.full_name || 'Not set'}</p>
                  </div>
                </div>
                {user.bio && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-sm text-slate-500 mb-1">Bio</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{user.bio}</p>
                  </div>
                )}
                {(user.instagram || user.twitter || user.website) && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-sm text-slate-500 mb-2">Social Links</p>
                    <div className="flex flex-wrap gap-3">
                      {user.instagram && (
                        <a 
                          href={`https://instagram.com/${user.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                        >
                          <Instagram className="w-4 h-4" />
                          <span className="text-sm">@{user.instagram.replace('@', '')}</span>
                        </a>
                      )}
                      {user.twitter && (
                        <a 
                          href={`https://twitter.com/${user.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                        >
                          <Twitter className="w-4 h-4" />
                          <span className="text-sm">@{user.twitter.replace('@', '')}</span>
                        </a>
                      )}
                      {user.website && (
                        <a 
                          href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                        >
                          <Globe className="w-4 h-4" />
                          <span className="text-sm">Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-slate-900/50 border-slate-800 mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Email Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">Livestream Alerts</p>
                <p className="text-sm text-slate-400">Get notified when we go live</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{notifyLivestream ? 'On' : 'Off'}</span>
                <Switch
                  checked={notifyLivestream}
                  onCheckedChange={(checked) => {
                    setNotifyLivestream(checked);
                    base44.auth.updateMe({ notify_livestream: checked });
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">New Posts</p>
                <p className="text-sm text-slate-400">Get notified about new community posts</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{notifyNewPosts ? 'On' : 'Off'}</span>
                <Switch
                  checked={notifyNewPosts}
                  onCheckedChange={(checked) => {
                    setNotifyNewPosts(checked);
                    base44.auth.updateMe({ notify_new_posts: checked });
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">Forum Updates</p>
                <p className="text-sm text-slate-400">Get notified for threads you follow</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{notifyForum ? 'On' : 'Off'}</span>
                <Switch
                  checked={notifyForum}
                  onCheckedChange={(checked) => {
                    setNotifyForum(checked);
                    base44.auth.updateMe({ notify_forum: checked });
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">Direct Messages</p>
                <p className="text-sm text-slate-400">Get notified when you receive a DM</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{notifyMessages ? 'On' : 'Off'}</span>
                <Switch
                  checked={notifyMessages}
                  onCheckedChange={(checked) => {
                    setNotifyMessages(checked);
                    base44.auth.updateMe({ notify_messages: checked });
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card className="bg-slate-900/50 border-slate-800 mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Push Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">Livestream Alerts</p>
                <p className="text-sm text-slate-400">Get notified when we go live</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{pushLivestream ? 'On' : 'Off'}</span>
                <Switch
                  checked={pushLivestream}
                  onCheckedChange={async (checked) => {
                    setPushLivestream(checked);
                    const existing = await base44.entities.NotificationPreference.filter({ user_email: user.email, notification_type: 'livestream' });
                    if (existing.length > 0) {
                      await base44.entities.NotificationPreference.update(existing[0].id, { push_enabled: checked });
                    } else {
                      await base44.entities.NotificationPreference.create({ user_email: user.email, notification_type: 'livestream', push_enabled: checked, email_enabled: true });
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">New Posts</p>
                <p className="text-sm text-slate-400">Get notified about new community posts</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{pushNewPosts ? 'On' : 'Off'}</span>
                <Switch
                  checked={pushNewPosts}
                  onCheckedChange={async (checked) => {
                    setPushNewPosts(checked);
                    const existing = await base44.entities.NotificationPreference.filter({ user_email: user.email, notification_type: 'new_post' });
                    if (existing.length > 0) {
                      await base44.entities.NotificationPreference.update(existing[0].id, { push_enabled: checked });
                    } else {
                      await base44.entities.NotificationPreference.create({ user_email: user.email, notification_type: 'new_post', push_enabled: checked, email_enabled: true });
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">Forum Updates</p>
                <p className="text-sm text-slate-400">Get notified for threads you follow</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{pushForum ? 'On' : 'Off'}</span>
                <Switch
                  checked={pushForum}
                  onCheckedChange={async (checked) => {
                    setPushForum(checked);
                    const existing = await base44.entities.NotificationPreference.filter({ user_email: user.email, notification_type: 'thread_reply' });
                    if (existing.length > 0) {
                      await base44.entities.NotificationPreference.update(existing[0].id, { push_enabled: checked });
                    } else {
                      await base44.entities.NotificationPreference.create({ user_email: user.email, notification_type: 'thread_reply', push_enabled: checked, email_enabled: true });
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <p className="text-white font-medium">New Messages</p>
                <p className="text-sm text-slate-400">Get notified for direct messages</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{pushMessages ? 'On' : 'Off'}</span>
                <Switch
                  checked={pushMessages}
                  onCheckedChange={async (checked) => {
                    setPushMessages(checked);
                    const existing = await base44.entities.NotificationPreference.filter({ user_email: user.email, notification_type: 'new_message' });
                    if (existing.length > 0) {
                      await base44.entities.NotificationPreference.update(existing[0].id, { push_enabled: checked });
                    } else {
                      await base44.entities.NotificationPreference.create({ user_email: user.email, notification_type: 'new_message', push_enabled: checked, email_enabled: true });
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Friends */}
      <Card className="bg-slate-900/50 border-slate-800 mb-4 cursor-pointer hover:border-slate-700 transition-colors" onClick={() => navigate(createPageUrl('Friends'))}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Friends</p>
                <p className="text-xs text-slate-400">Manage friends & discover members</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500" />
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card className="bg-slate-900/50 border-slate-800 mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-4">Help & Support</h3>
          <div className="space-y-3">
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <span className="text-slate-300">Contact Support</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </a>
            <a
              href="https://patreon.com/sailingdoodles"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Anchor className="w-5 h-5 text-cyan-400" />
                <span className="text-slate-300">Manage Subscription</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Delete Account Permanently
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 space-y-3">
                <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
                <p className="font-medium text-white">Type <span className="text-red-400">DELETE</span> to confirm:</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                onClick={() => setDeleteConfirmText('')}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Forever'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}