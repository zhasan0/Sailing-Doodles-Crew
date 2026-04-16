import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Anchor, Users, Radio, MapPin, MessageSquare, Instagram, Twitter, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('Feed'));
          return;
        }
        const userData = await base44.auth.me();
        
        // Auto-check membership on first login (non-blocking)
        if (userData.membership_status !== 'active' && userData.role !== 'admin') {
          try {
            await base44.functions.invoke('verifyMembership', {});
            const updatedUser = await base44.auth.me();
            setUser(updatedUser);
          } catch (err) {
            console.error('Failed to check membership:', err);
            setUser(userData);
          }
        } else {
          setUser(userData);
        }
        
        setDisplayName(userData.display_name || userData.full_name || '');
        setBio(userData.bio || '');
        setInstagram(userData.instagram || '');
        setTwitter(userData.twitter || '');
        setWebsite(userData.website || '');
        setAvatarUrl(userData.avatar_url || '');
        
        // Set notification defaults to false if not already set
        if (userData.notify_livestream === undefined) {
          await base44.auth.updateMe({
            notify_livestream: false,
            notify_new_posts: false,
            notify_forum: false
          });
        }
      } catch (err) {
        console.error(err);
        navigate(createPageUrl('Feed'));
      }
      setLoading(false);
    };
    loadUser();
  }, [navigate]);

  const autoFriendWithAdmin = async (name) => {
    try {
      await base44.functions.invoke('autoFriendNewUser', { email: user.email, name });
    } catch (e) {
      // non-critical, ignore
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      autoFriendWithAdmin(displayName || user.full_name || user.email);
      navigate(createPageUrl('Feed'));
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      display_name: displayName,
      bio,
      instagram,
      twitter,
      website,
      avatar_url: avatarUrl,
      notify_livestream: true,
      notify_new_posts: true,
      notify_forum: true
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(result.file_url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleSkip = async () => {
    const name = user.full_name || user.email.split('@')[0];
    await base44.auth.updateMe({ 
      display_name: name,
      notify_livestream: true,
      notify_new_posts: true,
      notify_forum: true
    });
    await autoFriendWithAdmin(name);
    navigate(createPageUrl('Feed'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="px-4 py-6 max-w-2xl">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Anchor className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">Welcome to Sailing Doodles</h1>
        </div>
        <p className="text-slate-400 text-lg mb-2">Your community awaits!</p>
        <p className="text-slate-500 mb-4">Let's set up your profile and explore what we have to offer.</p>
        
        {/* Signup Instructions */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-left max-w-md mx-auto">
          <p className="text-cyan-400 font-semibold mb-2 text-sm flex items-center gap-2">
            <span>⚓</span> Welcome aboard!
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            You've signed in to your <strong>Sailing Doodles account</strong>. Set up your profile below to get started. If you're a Patreon or Podia subscriber, use the same email you subscribed with to unlock full member access.
          </p>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link to={createPageUrl('ChatRoom')}>
          <Card className="bg-slate-900/50 border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <p className="text-sm font-medium text-white">Community</p>
              <p className="text-xs text-slate-400">Connect with other sailing enthusiasts</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('Forum')}>
          <Card className="bg-slate-900/50 border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <MessageSquare className="w-6 h-6 text-cyan-400" />
              <p className="text-sm font-medium text-white">Forum</p>
              <p className="text-xs text-slate-400">Discuss sailing topics and share tips</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('Livestreams')}>
          <Card className="bg-slate-900/50 border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Radio className="w-6 h-6 text-cyan-400" />
              <p className="text-sm font-medium text-white">Live Events</p>
              <p className="text-xs text-slate-400">Watch live streams and announcements</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('Guide')}>
          <Card className="bg-slate-900/50 border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <MapPin className="w-6 h-6 text-cyan-400" />
              <p className="text-sm font-medium text-white">Adventure Map</p>
              <p className="text-xs text-slate-400">Explore sailing destinations</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Profile Setup Form */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Complete Your Profile</CardTitle>
          <p className="text-sm text-slate-400 mt-2">Help other members get to know you better</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar Upload */}
          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Profile Picture</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {(displayName || user.email)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white" asChild>
                  <span>Choose Image</span>
                </Button>
              </label>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <Label className="text-slate-400 text-sm">Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="How should we call you?"
            />
          </div>

          {/* Bio */}
          <div>
            <Label className="text-slate-400 text-sm">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white mt-1 min-h-[80px]"
              placeholder="Tell us about yourself, your sailing experience, or what you love about the sea..."
            />
          </div>

          {/* Social Links */}
          <div>
            <Label className="text-slate-400 text-sm mb-3 block">Social Links (Optional)</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-slate-400" />
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@yourusername"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-slate-400" />
                <Input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourusername"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-400 hover:text-white"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Continue to Feed
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-500">
        You can always update your profile later from your Profile page
      </p>
    </div>
  );
}