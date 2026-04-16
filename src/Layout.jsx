import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from './utils';
import { Newspaper, Radio, MapPin, User, Bell, Shield, Loader2, Anchor, MessageCircle, MessageSquare, Map, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import DarkModeHandler from '@/components/DarkModeHandler';
import PushNotificationHandler from '@/components/PushNotificationHandler';
import Base44RemovalHelper from '@/components/Base44RemovalHelper';
import TermsGate from '@/components/TermsGate';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [tabStacks, setTabStacks] = useState({
    Feed: [],
    Forum: [],
    ChatRoom: [],
    Livestreams: [],
    Guide: [],
    Profile: [],
  });
  const navigate = useNavigate();
  const contentRef = React.useRef(null);
  const bottomNavPages = ['Feed', 'Forum', 'ChatRoom', 'Livestreams', 'Guide', 'Profile'];

  // Stack preservation for bottom nav
  useEffect(() => {
    const isBottomNavPage = bottomNavPages.includes(currentPageName);
    if (!isBottomNavPage) {
      // For detail pages, add to the stack of the parent tab
      const parentTab = bottomNavPages.find(page => tabStacks[page].length > 0);
      if (parentTab) {
        setTabStacks(prev => ({
          ...prev,
          [parentTab]: [...prev[parentTab], { page: currentPageName, url: window.location.pathname + window.location.search }]
        }));
      }
    }
  }, [currentPageName]);

  const handleTabClick = (tabPage) => {
    if (currentPageName === tabPage) {
      // Reset stack if clicking active tab
      setTabStacks(prev => ({
        ...prev,
        [tabPage]: []
      }));
      navigate(createPageUrl(tabPage));
    } else {
      const stack = tabStacks[tabPage];
      if (stack.length > 0) {
        // Restore to last page in stack
        const lastPage = stack[stack.length - 1];
        navigate(lastPage.url);
      } else {
        navigate(createPageUrl(tabPage));
      }
    }
  };

  const handleBackButton = () => {
    const currentTab = bottomNavPages.find(page => tabStacks[page].some(item => item.page === currentPageName));
    if (currentTab) {
      // Pop from stack and go back
      setTabStacks(prev => ({
        ...prev,
        [currentTab]: prev[currentTab].slice(0, -1)
      }));
    }
    navigate(-1);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setLoading(false);
          return;
        }
        const userData = await base44.auth.me();

        // Check if user should see Welcome page (new user with no profile data)
        const isNewUser = !userData.display_name;
        const allowedWithoutProfile = ['Welcome', 'Profile', 'Login', 'AccessRequired', 'Notifications', 'Admin'];

        if (isNewUser && !allowedWithoutProfile.includes(currentPageName)) {
          navigate(createPageUrl('Welcome'));
          setLoading(false);
          return;
        }

        // Redirect returning users from Welcome to Landing
        if (!isNewUser && currentPageName === 'Welcome') {
          navigate(createPageUrl('Landing'));
          setLoading(false);
          return;
        }
        
        setUser(userData);
        if (!userData.terms_accepted) setShowTerms(true);

        // Load unread notifications
        const [notifications, reads, dmConvos1, dmConvos2] = await Promise.all([
          base44.entities.Notification.filter({ for_all: true }),
          base44.entities.NotificationRead.filter({ user_email: userData.email }),
          base44.entities.DMConversation.filter({ participant1_email: userData.email }),
          base44.entities.DMConversation.filter({ participant2_email: userData.email }),
        ]);
        const readIds = new Set(reads.map(r => r.notification_id));
        setUnreadCount(notifications.filter(n => !readIds.has(n.id)).length);

        // Unread DMs
        const totalUnread = dmConvos1.reduce((s, c) => s + (c.unread_p1 || 0), 0)
          + dmConvos2.reduce((s, c) => s + (c.unread_p2 || 0), 0);
        setUnreadDMs(totalUnread);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadUser();
  }, [currentPageName]);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DarkModeHandler />
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPageName === 'Login' || currentPageName === 'Welcome') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'hsl(var(--background))', overflowY: 'auto' }}>
        <DarkModeHandler />
        {children}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check membership status
  const isAdmin = user.role === 'admin';
  const isActive = user.membership_status === 'active' || isAdmin;

  // Pages that should show back button (child/detail pages)
  const childPages = ['Thread', 'Location', 'Admin', 'Notifications', 'Messages', 'Friends', 'DMThread', 'MemberProfile'];
  const showBackButton = childPages.includes(currentPageName);

  const navItems = [
    { name: 'Feed', icon: Newspaper, page: 'Feed' },
    { name: 'Forum', icon: MessageSquare, page: 'Forum' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatRoom' },
    { name: 'Live', icon: Radio, page: 'Livestreams' },
    { name: 'Guide', icon: Map, page: 'Guide' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];



  // Define safe-area heights once here — everything else references these
  const HEADER_CONTENT_H = 56; // px of actual nav content
  const NAV_CONTENT_H = 56;    // px of actual bottom nav content

  return (
    <div
      className="text-foreground"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'hsl(var(--background))',
      }}
    >
      <DarkModeHandler />
      <PushNotificationHandler />
      <Base44RemovalHelper />
      {showTerms && <TermsGate onAccepted={() => setShowTerms(false)} />}

      <header
        className="z-40 border-b border-border flex-shrink-0"
        style={{
          backgroundColor: 'hsl(var(--background))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div
          className="px-4 flex items-center justify-between"
          style={{ height: `${HEADER_CONTENT_H}px` }}
        >
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackButton}
              className="text-muted-foreground hover:text-foreground -ml-2 w-14 h-14"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          ) : (
            <button onClick={() => navigate(createPageUrl('Landing'))} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Anchor className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Sailing Doodles</span>
            </button>
          )}
          <div className="flex items-center gap-1">
            <Link to={createPageUrl('Messages')}>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground w-12 h-12">
                <MessageCircle className="w-6 h-6" />
                {unreadDMs > 0 && (
                  <Badge className="absolute top-0 right-0 h-5 w-5 p-0 flex items-center justify-center bg-cyan-500 text-xs font-bold">
                    {unreadDMs > 9 ? '9+' : unreadDMs}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link to={createPageUrl('Notifications')}>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground w-12 h-12">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <Badge className="absolute top-0 right-0 h-5 w-5 p-0 flex items-center justify-center bg-cyan-500 text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            {isAdmin && (
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-amber-400 hover:text-amber-300 w-12 h-12">
                  <Shield className="w-6 h-6" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        ref={contentRef}
        style={{
          flex: '1 1 0',
          minHeight: 0,
          overflowY: currentPageName === 'ChatRoom' ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: currentPageName === 'ChatRoom' ? 0 : `calc(${NAV_CONTENT_H}px + env(safe-area-inset-bottom))`,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPageName}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full"
          >
            {React.cloneElement(children, { isInactive: !isActive })}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        style={{
          flexShrink: 0,
          zIndex: 40,
          backgroundColor: '#000000',
          borderTop: '1px solid hsl(var(--border))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around" style={{ height: `${NAV_CONTENT_H}px`, padding: '0.5rem 0' }}>
          {navItems.map((item) => {
            const isActive = currentPageName === item.page || tabStacks[item.page].some(s => s.page === currentPageName);
            return (
              <button
                key={item.page}
                onClick={() => handleTabClick(item.page)}
                className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-all min-w-[64px] ${
                  isActive ? 'text-cyan-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}