/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccessRequired from './pages/AccessRequired';
import Admin from './pages/Admin';
import ChatRoom from './pages/ChatRoom';
import DMThread from './pages/DMThread';
import Feed from './pages/Feed';
import Forum from './pages/Forum';
import Friends from './pages/Friends';
import Guide from './pages/Guide';
import Landing from './pages/Landing';
import Livestreams from './pages/Livestreams';
import Location from './pages/Location';
import MemberProfile from './pages/MemberProfile';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Thread from './pages/Thread';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessRequired": AccessRequired,
    "Admin": Admin,
    "ChatRoom": ChatRoom,
    "DMThread": DMThread,
    "Feed": Feed,
    "Forum": Forum,
    "Friends": Friends,
    "Guide": Guide,
    "Landing": Landing,
    "Livestreams": Livestreams,
    "Location": Location,
    "MemberProfile": MemberProfile,
    "Messages": Messages,
    "Notifications": Notifications,
    "Profile": Profile,
    "Thread": Thread,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};