import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, CreditCard, Award, MessageSquare,
  AlertTriangle, Bell, LogOut, Shield, Brain, ChevronRight, Coins
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col" style={{
        background: 'linear-gradient(175deg, #1e1b4b 0%, #2d2a6e 60%, #312e81 100%)'
      }}>
        {/* Logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-lg">
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
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
                  {isActive && <ChevronRight size={13} className="text-white/40" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
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
            className="mt-1 w-full flex items-center gap-2 px-2 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 text-xs transition-all duration-150"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-8 shrink-0 shadow-sm">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Connecté" />
            <span className="text-sm text-slate-600 font-medium">{user?.full_name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
