import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatMoney, formatDate } from '../utils/format';
import { Users, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Admin() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/dashboard/admin').then((r) => setData(r.data)); }, []);
  if (!data) return <div>Chargement…</div>;

  const stats = [
    { label: 'Utilisateurs', value: data.users, icon: Users },
    { label: 'Tontines', value: data.tontines, icon: TrendingUp },
    { label: 'Tontines actives', value: data.active_tontines, icon: TrendingUp },
    { label: 'Volume total', value: formatMoney(data.total_volume), icon: Wallet },
    { label: 'Litiges ouverts', value: data.open_disputes, icon: AlertTriangle },
    { label: 'Anomalies', value: data.anomalies, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de la plateforme TontineDigital.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-sm text-slate-500 flex items-center gap-2"><s.icon size={16} /> {s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Alertes récentes</div>
        {data.recent_alerts.length === 0 ? (
          <div className="text-slate-400 text-sm">Aucune alerte.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_alerts.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.description}</div>
                  <div className="text-xs text-slate-500">{formatDate(a.created_at)}</div>
                </div>
                <span className={`badge ${
                  a.severity === 'high' ? 'bg-red-100 text-red-800' :
                  a.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-700'
                }`}>{a.severity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
