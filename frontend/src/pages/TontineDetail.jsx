import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { formatMoney, formatDate, statusLabel, statusColor } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { Mail, Play, AlertCircle } from 'lucide-react';

export default function TontineDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('error');

  const load = () => api.get(`/tontines/${id}`).then((r) => setT(r.data));
  useEffect(() => { load(); }, [id]);

  if (!t) return <div className="p-8 text-slate-500">Chargement…</div>;

  const isOwner = t.owner_id === user.id;
  const myMembership = t.members.find((m) => m.user_id === user.id);
  const acceptedCount = t.members.filter((m) => m.status === 'accepted').length;
  const pendingMembers = t.members.filter((m) => m.status === 'invited');
  const canStart = isOwner && t.status === 'pending' && acceptedCount === t.members_target;

  const showMsg = (text, type = 'error') => { setMsg(text); setMsgType(type); };

  const invite = async () => {
    setMsg('');
    try {
      await api.post(`/tontines/${id}/invite`, { email });
      showMsg('Invitation envoyée avec succès.', 'success');
      setEmail('');
      load();
    } catch (e) {
      showMsg(e.response?.data?.error || 'Erreur lors de l\'invitation.');
    }
  };

  const respond = async (accept) => {
    setMsg('');
    try {
      await api.post(`/tontines/${id}/respond`, { accept });
      showMsg(accept ? 'Vous avez rejoint la tontine !' : 'Invitation refusée.', 'success');
      load();
    } catch (e) {
      const errMsg = e.response?.data?.error || 'Erreur';
      if (errMsg === 'Déjà répondu') {
        showMsg('Vous avez déjà répondu à cette invitation. Rechargez la page.');
      } else {
        showMsg(errMsg);
      }
    }
  };

  const start = async () => {
    setMsg('');
    if (!canStart) return;
    try {
      await api.post(`/tontines/${id}/start`);
      showMsg('Tontine démarrée avec succès !', 'success');
      load();
    } catch (e) {
      showMsg(e.response?.data?.error || 'Erreur lors du démarrage.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.name}</h1>
          <p className="text-slate-500 mt-1">{t.description}</p>
          <div className="mt-2 flex gap-2 items-center">
            <span className={`badge ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
            <span className="text-sm text-slate-500">{formatMoney(t.amount, t.currency)} / {t.frequency === 'weekly' ? 'sem' : 'mois'}</span>
          </div>
        </div>

        {isOwner && t.status === 'pending' && (
          <div className="text-right">
            <button
              onClick={start}
              disabled={!canStart}
              className={`btn-primary ${!canStart ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!canStart ? `En attente de ${pendingMembers.length} membre(s)` : ''}
            >
              <Play size={16} className="mr-1" /> Démarrer la tontine
            </button>
            {!canStart && pendingMembers.length > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center justify-end gap-1">
                <AlertCircle size={12} />
                En attente de {pendingMembers.length} membre(s) invité(s)
              </p>
            )}
          </div>
        )}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msgType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {myMembership?.status === 'invited' && (
        <div className="card p-4 bg-amber-50 border border-amber-200 flex items-center justify-between">
          <span className="font-medium text-amber-800">Vous avez été invité(e) à rejoindre cette tontine.</span>
          <div className="flex gap-2">
            <button onClick={() => respond(true)} className="btn-primary">Accepter</button>
            <button onClick={() => respond(false)} className="btn-outline">Refuser</button>
          </div>
        </div>
      )}

      {isOwner && pendingMembers.length > 0 && t.status === 'pending' && (
        <div className="card p-4 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">
            En attente de réponse de : {pendingMembers.map(m => m.full_name).join(', ')}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Ces membres doivent se connecter à leur compte et accepter l'invitation depuis "Mes tontines" ou "Notifications".
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="font-semibold mb-3">
            Membres ({acceptedCount}/{t.members_target} acceptés)
          </div>
          <ul className="divide-y divide-slate-100">
            {t.members.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.full_name}</div>
                  <div className="text-xs text-slate-500">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Score {m.trust_score?.toFixed(0)}</span>
                  <span className={`badge ${statusColor[m.status]}`}>{statusLabel[m.status]}</span>
                </div>
              </li>
            ))}
          </ul>

          {isOwner && t.status === 'pending' && acceptedCount < t.members_target && (
            <div className="mt-4 space-y-2">
              {t.members.length < t.members_target && (
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="email@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && invite()}
                  />
                  <button onClick={invite} className="btn-primary"><Mail size={16} /></button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="font-semibold mb-3">Cycles</div>
          {t.cycles.length === 0 ? (
            <div className="text-slate-400 text-sm">Aucun cycle généré (la tontine n'a pas encore démarré).</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {t.cycles.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Cycle {c.cycle_index} — {c.beneficiary_name}</div>
                    <div className="text-xs text-slate-500">échéance : {formatDate(c.due_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-700">{formatMoney(c.total_amount, t.currency)}</span>
                    <span className={`badge ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
