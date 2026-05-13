import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatMoney, formatDate } from '../utils/format';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Users, PiggyBank, Wallet, Award, ArrowRight, Bell } from 'lucide-react';

function StatCard({ label, value, icon: Icon, gradient, sub }) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="font-semibold text-primary-700">{payload[0].value.toFixed(2)} €</p>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/me').then((r) => setData(r.data));
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    {
      label: 'Tontines actives',
      value: data.tontines_count,
      icon: Users,
      gradient: 'bg-gradient-to-br from-primary-600 to-primary-800',
    },
    {
      label: 'Total épargné',
      value: formatMoney(data.total_saved),
      icon: PiggyBank,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    },
    {
      label: 'Total reçu',
      value: formatMoney(data.total_received),
      icon: Wallet,
      gradient: 'bg-gradient-to-br from-violet-500 to-violet-700',
    },
    {
      label: 'Score de confiance',
      value: `${data.trust_score?.toFixed(0) ?? '–'} / 100`,
      icon: Award,
      gradient: 'bg-gradient-to-br from-amber-400 to-orange-500',
      sub: data.trust_score >= 70 ? 'Excellent' : data.trust_score >= 50 ? 'Bon' : 'À améliorer',
    },
  ];

  const monthly = data.monthly_history.map((m) => ({ month: m.month, total: m.total / 100 }));

  return (
    <div className="space-y-8">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Bienvenue — voici votre activité en un coup d'œil.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts + upcoming */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title mb-0">Cotisations mensuelles</p>
              <p className="text-xs text-slate-400">12 derniers mois</p>
            </div>
            <TrendingUp size={18} className="text-primary-400" />
          </div>
          {monthly.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-slate-400 text-sm">
              Aucune donnée disponible.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#4f46e5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming */}
        <div className="card p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Prochaines échéances</p>
            <Link to="/payments" className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
              Tout voir <ArrowRight size={11} />
            </Link>
          </div>
          {data.upcoming_contributions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Aucune cotisation à venir.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 flex-1">
              {data.upcoming_contributions.map((u, i) => (
                <li key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{u.tontine}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(u.due_date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-600 shrink-0">
                    {formatMoney(u.amount, u.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {data.unread_notifications > 0 && (
        <Link
          to="/notifications"
          className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100 hover:bg-primary-100 transition group"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <Bell size={15} className="text-primary-600" />
          </div>
          <div className="flex-1 text-sm text-primary-800">
            Vous avez <span className="font-bold">{data.unread_notifications}</span> notification{data.unread_notifications > 1 ? 's' : ''} non lue{data.unread_notifications > 1 ? 's' : ''}.
          </div>
          <ArrowRight size={15} className="text-primary-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}
