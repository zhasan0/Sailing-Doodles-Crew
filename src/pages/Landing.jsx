import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Anchor, Users, Radio, MapPin, MessageSquare, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="px-4 py-6 max-w-2xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Anchor className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-foreground">Sailing Doodles</h1>
        </div>
        <p className="text-foreground/80 text-lg mb-2">Your community of sailing enthusiasts</p>
        <p className="text-muted-foreground mb-6">Share stories, connect, and explore the world together</p>
        
        {/* Signup Instructions */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-left max-w-md mx-auto">
          <p className="text-cyan-400 font-semibold mb-2 text-sm flex items-center gap-2">
            <span>⚓</span> New Member? Important Setup Instructions
          </p>
          <p className="text-foreground/90 text-sm leading-relaxed">
            Create a Sailing Doodles account to sign in using <strong>Email</strong> or <strong>Sign in with Apple</strong>.
          </p>
          <p className="text-foreground/90 text-sm leading-relaxed mt-3">
            <strong>Already a Patreon member?</strong><br />
            Use the same email as your Patreon subscription, or add your Patreon email later in <strong>Profile</strong> to verify your membership and unlock access.
          </p>
          <p className="text-foreground/90 text-sm leading-relaxed mt-3">
            <strong>Not a Patreon member?</strong><br />
            You can subscribe directly in the iOS app to unlock full access.
          </p>
          <p className="text-amber-400 text-xs leading-relaxed mt-3">
            ⚠️ <strong>Important:</strong> Patreon is used only to verify membership access — not for login.
          </p>
        </div>
      </div>

      {/* Featured Sections */}
      <div className="space-y-4 mb-8">
        <Link to={createPageUrl('Feed')}>
          <Card className="bg-card/50 border-border hover:border-cyan-500 cursor-pointer transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Anchor className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Latest Updates</h3>
                  <p className="text-sm text-muted-foreground">Posts from the community</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Livestreams')}>
          <Card className="bg-card/50 border-border hover:border-cyan-500 cursor-pointer transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Live Events</h3>
                  <p className="text-sm text-muted-foreground">Watch live streams and announcements</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Forum')}>
          <Card className="bg-card/50 border-border hover:border-cyan-500 cursor-pointer transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Forum</h3>
                  <p className="text-sm text-muted-foreground">Discuss sailing topics and share tips</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('ChatRoom')}>
          <Card className="bg-card/50 border-border hover:border-cyan-500 cursor-pointer transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Community Chat</h3>
                  <p className="text-sm text-muted-foreground">Connect with other sailing enthusiasts</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Guide')}>
          <Card className="bg-card/50 border-border hover:border-cyan-500 cursor-pointer transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Adventure Map</h3>
                  <p className="text-sm text-muted-foreground">Explore sailing destinations</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Profile')}>
          <Card className="bg-card/50 border-border hover:border-cyan-500 cursor-pointer transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Anchor className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Edit Your Profile</h3>
                  <p className="text-sm text-muted-foreground">Update your information and settings</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}