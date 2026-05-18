import { useEffect, useState } from 'react';
import api from '../api/client';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/format';
import { Info } from 'lucide-react';

export default function Score() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/score/me').then((r) => setData(r.data)); }, []);

  if (!data) return <div>Chargement…</div>;

  const score = data.score || 0;
  const chartData = [{ name: 'score', value: score, fill: score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444' }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon score de fiabilité</h1>
        <p className="text-slate-500 mt-1">Score calculé par notre IA sur la base de votre comportement.</p>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-800">
        <Info size={17} className="shrink-0 mt-0.5 text-violet-500" />
        <div>
          <span className="font-semibold">Comment améliorer votre score ?</span> Payez vos cotisations à temps, participez activement aux tontines et évitez les litiges.
          Un score supérieur à 70 vous donne accès aux meilleures tontines et renforce la confiance des autres membres envers vous.
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center">
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={20} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="text-4xl font-bold text-primary-600 -mt-32">{score.toFixed(0)}</div>
          <div className="text-sm text-slate-500 mt-32">sur 100</div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="font-semibold mb-3">Facteurs explicatifs</div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Cotisations à temps</span><span className="font-medium text-emerald-700">{data.factors.on_time_payments}</span></li>
            <li className="flex justify-between"><span>Cotisations en retard</span><span className="font-medium text-amber-700">{data.factors.late_payments}</span></li>
            <li className="flex justify-between"><span>Cotisations manquées</span><span className="font-medium text-red-700">{data.factors.missed_payments}</span></li>
            <li className="flex justify-between"><span>Tontines complétées</span><span className="font-medium">{data.factors.completed_tontines}</span></li>
            <li className="flex justify-between"><span>Signalements reçus</span><span className="font-medium">{data.factors.reports_against_user}</span></li>
            <li className="flex justify-between"><span>Ratio paiements à temps</span><span className="font-medium">{(data.factors.on_time_ratio * 100).toFixed(0)} %</span></li>
            {data.factors.ml_proba !== null && data.factors.ml_proba !== undefined && (
              <li className="flex justify-between"><span>Probabilité ML de fiabilité</span><span className="font-medium">{data.factors.ml_proba} %</span></li>
            )}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Événements récents</div>
        {data.recent_events.length === 0 ? (
          <div className="text-slate-400 text-sm">Aucun événement enregistré.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_events.map((e, i) => (
              <li key={i} className="py-2 flex items-center justify-between text-sm">
                <span className="text-slate-700">{e.event_type.replace(/_/g, ' ')}</span>
                <span className="text-xs text-slate-500">{formatDate(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
