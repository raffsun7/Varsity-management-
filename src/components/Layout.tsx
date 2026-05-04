import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard, 
  Megaphone, 
  Video, 
  FileText, 
  Lightbulb, 
  ShieldCheck, 
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { logout, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Notification } from '../types';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const userGroup = user.role === 'admin' ? 'admin_all' : 'student_all';
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [user.uid, userGroup]),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    return unsubscribe;
  }, [user]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Notices', path: '/notices', icon: Megaphone },
    { name: 'Lectures', path: '/lectures', icon: Video },
    { name: 'Notes', path: '/notes', icon: FileText },
    { name: 'Suggestions', path: '/suggestions', icon: Lightbulb },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to end your session?')) {
      await logout();
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#111111] border-r border-white/5">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-xl leading-none">U</span>
            </div>
            <h1 className="font-sans font-bold text-lg tracking-tight">UniHub</h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm",
                  location.pathname === item.path 
                    ? "bg-white text-black font-medium shadow-lg shadow-white/10" 
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6 px-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden">
              <span className="text-xs font-bold">{user?.name?.slice(0, 2).toUpperCase() || 'UN'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-neutral-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-neutral-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 md:px-12 border-bottom border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <button 
            className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 md:hidden ml-4">
            <h1 className="font-bold text-lg">UniHub</h1>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-neutral-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full ring-2 ring-black" />
              )}
            </button>
          </div>

          <NotificationCenter 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)} 
            notifications={notifications}
          />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-6xl mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 right-1/4 bg-[#111111] z-50 md:hidden flex flex-col p-8"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold">U</span>
                  </div>
                  <h1 className="font-bold text-lg">UniHub</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all",
                      location.pathname === item.path 
                        ? "bg-white text-black font-semibold shadow-xl shadow-white/10" 
                        : "text-neutral-400"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-white/5 pt-8">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 px-4 py-4 w-full text-red-400 font-medium"
                >
                  <LogOut className="w-6 h-6" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
