import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function CreateTontine() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', description: '', amount: 100, currency: 'EUR',
    frequency: 'monthly', members_target: 5, order_strategy: 'random',
  });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/tontines', { ...form, amount: form.amount * 100 });
      navigate(`/tontines/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-1">Nouvelle tontine</h1>
      <p className="text-slate-500 mb-6">Définissez les règles de votre tontine, vous pourrez ensuite inviter les membres.</p>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Nom *</label>
          <input className="input mt-1" required minLength={3}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea className="input mt-1" rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Montant par cotisation</label>
            <input className="input mt-1" type="number" min={1} required
              value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium">Devise</label>
            <select className="input mt-1" value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option>EUR</option><option>USD</option><option>GBP</option><option>XOF</option><option>XAF</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Fréquence</label>
            <select className="input mt-1" value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Nombre de membres</label>
            <input className="input mt-1" type="number" min={2} max={30} required
              value={form.members_target} onChange={(e) => setForm({ ...form, members_target: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Ordre de passage</label>
          <select className="input mt-1" value={form.order_strategy}
            onChange={(e) => setForm({ ...form, order_strategy: e.target.value })}>
            <option value="random">Aléatoire</option>
            <option value="fixed">Ordre fixe (ordre d'inscription)</option>
            <option value="bid">Enchère mensuelle</option>
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-3">
          <button className="btn-primary">Créer la tontine</button>
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
