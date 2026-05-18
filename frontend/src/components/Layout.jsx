import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import {
  LayoutDashboard, Users, CreditCard, Award, MessageSquare,
  AlertTriangle, Bell, LogOut, Shield, Brain, ChevronRight, Coins, Menu
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const fetchNotifs = () => {
      api.get('/notifications').then(r => {
        setUnreadCount(r.data.filter(n => !n.read_at).length);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/dashboard',      label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/tontines',       label: 'Mes tontines',    icon: Users },
    { to: '/payments',       label: 'Cotisations',     icon: CreditCard },
    { to: '/score',          label: 'Mon score',       icon: Award },
    { to: '/ml',             label: 'Insights IA',     icon: Brain },
    { to: '/disputes',       label: 'Litiges',         icon: AlertTriangle },
    { to: '/chat',           label: 'Assistant',       icon: MessageSquare },
    { to: '/notifications',  label: 'Notifications',   icon: Bell },
  ];
  if (user?.role === 'admin') navItems.push({ to: '/admin', label: 'Administration', icon: Shield });

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const sidebarStyle = {
    background: 'linear-gradient(175deg, #1e1b4b 0%, #2d2a6e 60%, #312e81 100%)',
    ...(isMobile ? {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 50,
      width: 240,
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.2s ease',
    } : {
      position: 'relative',
      width: open ? 240 : 0,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }),
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile backdrop */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle} className="flex flex-col">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 group whitespace-nowrap"
          onClick={() => isMobile && setOpen(false)}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-lg shrink-0">
            <Coins size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">TontineDigital</span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => isMobile && setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group whitespace-nowrap ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} className={isActive ? 'text-primary-300' : 'text-white/50 group-hover:text-white/80'} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/notifications' && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {isActive && item.to !== '/notifications' && <ChevronRight size={13} className="text-white/40" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.full_name}</div>
              <div className="text-white/50 text-xs truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="mt-1 w-full flex items-center gap-2 px-2 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 text-xs transition-all duration-150 whitespace-nowrap"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 shrink-0 shadow-sm gap-3 sticky top-0 z-30">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
            title="Menu"
          >
            <Menu size={20} />
          </button>

          {/* Logo visible on mobile when sidebar closed */}
          {isMobile && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <Coins size={14} className="text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm">TontineDigital</span>
            </Link>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User name — hidden on small screens */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-600 font-medium">{user?.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
