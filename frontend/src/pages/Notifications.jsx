import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatDate } from '../utils/format';
import { Info } from 'lucide-react';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [responding, setResponding] = useState({});

  const load = () => api.get('/notifications').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post('/notifications/read-all'); load(); };

  const respondInvitation = async (notif, accept) => {
    const data = parseData(notif.data);
    if (!data?.tontineId) return;
    setResponding((p) => ({ ...p, [notif.id]: true }));
    try {
      await api.post(`/tontines/${data.tontineId}/respond`, { accept });
      await api.post(`/notifications/${notif.id}/read`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur');
    } finally {
      setResponding((p) => ({ ...p, [notif.id]: false }));
    }
  };

  const parseData = (raw) => {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-slate-500 mt-1">Vos dernières notifications.</p>
        </div>
        <button onClick={markAll} className="btn-outline">Tout marquer comme lu</button>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
        <Info size={17} className="shrink-0 mt-0.5 text-emerald-500" />
        <div>
          <span className="font-semibold">Vos notifications :</span> Vous recevez des alertes pour les invitations à rejoindre une tontine, les cotisations à venir, et les activités importantes.
          Acceptez ou refusez les invitations directement depuis cette page.
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        {list.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Aucune notification.</div>
        ) : list.map((n) => {
          const data = parseData(n.data);
          const isInvitation = n.type === 'tontine_invitation' && data?.tontineId;

          return (
            <div key={n.id} className={`p-4 ${!n.read_at ? 'bg-primary-50/40' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-sm text-slate-600 mt-1">{n.body}</div>}
                  <span className="text-xs text-slate-400">{formatDate(n.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isInvitation && !n.read_at && (
                    <>
                      <button
                        onClick={() => respondInvitation(n, true)}
                        disabled={responding[n.id]}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => respondInvitation(n, false)}
                        disabled={responding[n.id]}
                        className="btn-outline text-xs px-3 py-1"
                      >
                        Refuser
                      </button>
                    </>
                  )}
                  {data?.tontineId && (
                    <Link
                      to={`/tontines/${data.tontineId}`}
                      className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                    >
                      Voir →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
