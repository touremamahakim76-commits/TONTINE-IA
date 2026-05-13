import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatMoney, statusLabel, statusColor } from '../utils/format';
import { Plus } from 'lucide-react';

export default function Tontines() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/tontines').then((r) => setList(r.data)); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes tontines</h1>
          <p className="text-slate-500 mt-1">Gérez vos tontines en cours et créez-en de nouvelles.</p>
        </div>
        <Link to="/tontines/new" className="btn-primary"><Plus size={18} className="mr-1" /> Nouvelle tontine</Link>
      </div>

      {list.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Aucune tontine pour l'instant. <Link to="/tontines/new" className="text-primary-600 hover:underline">Créez votre première tontine</Link>.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((t) => (
            <Link to={`/tontines/${t.id}`} key={t.id} className="card p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-lg">{t.name}</div>
                <span className={`badge ${statusColor[t.status] || 'bg-slate-100'}`}>{statusLabel[t.status] || t.status}</span>
              </div>
              <div className="text-sm text-slate-500 mt-1 line-clamp-2">{t.description || '—'}</div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-600">{formatMoney(t.amount, t.currency)} / {t.frequency === 'weekly' ? 'sem' : 'mois'}</span>
                <span className="text-slate-600">{t.members_target} membres</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
