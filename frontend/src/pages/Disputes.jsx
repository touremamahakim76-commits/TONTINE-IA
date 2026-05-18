import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/format';
import { Info } from 'lucide-react';

export default function Disputes() {
  const [list, setList] = useState([]);
  const [tontines, setTontines] = useState([]);
  const [form, setForm] = useState({ tontineId: '', reason: '', description: '' });

  const load = async () => {
    const r1 = await api.get('/disputes');
    setList(r1.data);
    const r2 = await api.get('/tontines');
    setTontines(r2.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tontineId || !form.reason) return;
    await api.post('/disputes', form);
    setForm({ tontineId: '', reason: '', description: '' });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Litiges</h1>
        <p className="text-slate-500 mt-1">Signalez un problème ou suivez vos litiges en cours.</p>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-800">
        <Info size={17} className="shrink-0 mt-1 text-rose-500" />
        <div className="space-y-1">
          <p><span className="font-semibold">Quand ouvrir un litige ?</span> Uniquement en cas de problème sérieux : paiement non reçu, comportement frauduleux, ou membre qui ne cotise plus.</p>
          <p><span className="font-semibold">Comment ça fonctionne ?</span> Sélectionnez la tontine concernée, décrivez le problème clairement. Un administrateur examinera votre signalement.</p>
          <p><span className="font-semibold">Important :</span> Les litiges non fondés peuvent affecter votre propre score de fiabilité. Utilisez cette fonctionnalité de manière responsable.</p>
        </div>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-3">
        <div className="font-semibold">Ouvrir un litige</div>
        <select className="input" value={form.tontineId}
          onChange={(e) => setForm({ ...form, tontineId: e.target.value })}>
          <option value="">— Choisir une tontine —</option>
          {tontines.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input" placeholder="Raison (ex: paiement manquant)"
          value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <textarea className="input" rows={3} placeholder="Description détaillée (optionnel)"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="btn-primary">Soumettre</button>
      </form>

      <div className="card p-5">
        <div className="font-semibold mb-3">Mes litiges</div>
        {list.length === 0 ? (
          <div className="text-slate-400 text-sm">Aucun litige.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.tontine_name}</div>
                  <span className={`badge ${d.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {d.status}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-1">{d.reason}</div>
                {d.description && <div className="text-sm text-slate-500 mt-1">{d.description}</div>}
                <div className="text-xs text-slate-400 mt-1">
                  Ouvert par {d.opener_name} le {formatDate(d.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
