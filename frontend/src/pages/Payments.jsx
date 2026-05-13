import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatMoney, formatDate, statusLabel, statusColor } from '../utils/format';
import { CreditCard } from 'lucide-react';

export default function Payments() {
  const [list, setList] = useState([]);
  const [paying, setPaying] = useState(null);

  const load = () => api.get('/payments/contributions').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const pay = async (id) => {
    setPaying(id);
    try {
      await api.post(`/payments/contributions/${id}/pay`);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Échec du paiement');
    } finally {
      setPaying(null);
    }
  };

  const pending = list.filter((c) => c.status === 'pending' || c.status === 'failed');
  const history = list.filter((c) => c.status === 'paid');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cotisations</h1>
        <p className="text-slate-500 mt-1">Gérez vos cotisations en attente et consultez votre historique.</p>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">À payer</div>
        {pending.length === 0 ? (
          <div className="text-slate-400 text-sm">Aucune cotisation en attente.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.tontine_name} — Cycle {c.cycle_index}</div>
                  <div className="text-sm text-slate-500">échéance : {formatDate(c.due_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatMoney(c.amount, c.currency)}</span>
                  <span className={`badge ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                  <button onClick={() => pay(c.id)} disabled={paying === c.id}
                    className="btn-primary text-sm">
                    <CreditCard size={14} className="mr-1" />
                    {paying === c.id ? 'Paiement…' : 'Payer'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Historique ({history.length})</div>
        {history.length === 0 ? (
          <div className="text-slate-400 text-sm">Aucune cotisation payée.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Tontine</th>
                <th>Cycle</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((c) => (
                <tr key={c.id}>
                  <td className="py-2">{c.tontine_name}</td>
                  <td>{c.cycle_index}</td>
                  <td>{formatDate(c.paid_at)}</td>
                  <td className="font-medium">{formatMoney(c.amount, c.currency)}</td>
                  <td className="text-xs text-slate-500 font-mono">{c.payment_reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
