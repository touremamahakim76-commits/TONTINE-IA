import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatMoney, statusLabel, statusColor } from '../utils/format';
import { Plus, Info } from 'lucide-react';

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

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
        <Info size={17} className="shrink-0 mt-1 text-blue-500" />
        <div className="space-y-2">
          <p><span className="font-semibold">Qu'est-ce qu'une tontine ?</span> Un groupe d'épargne rotatif : chaque membre cotise régulièrement et reçoit la cagnotte à tour de rôle jusqu'à ce que tout le monde ait reçu.</p>
          <p><span className="font-semibold">Créer une tontine :</span> Cliquez sur "Nouvelle tontine", définissez le montant, la fréquence (hebdo/mensuel) et le nombre de membres. Invitez ensuite vos contacts par email depuis la page de la tontine.</p>
          <p><span className="font-semibold">Rejoindre une tontine :</span> Vous recevrez une invitation dans vos notifications. Acceptez-la pour rejoindre le groupe.</p>
          <p><span className="font-semibold">Démarrage :</span> La tontine démarre dès que tous les membres ont accepté l'invitation. Chaque cycle, un membre reçoit la cagnotte à tour de rôle selon l'ordre défini.</p>
        </div>
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
