import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatMoney } from '../utils/format';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Brain, Target, Users, Shield, AlertTriangle, TrendingDown, ChevronDown, ChevronUp, Info } from 'lucide-react';

export default function MLInsights() {
  const [models, setModels] = useState(null);
  const [defaultRisk, setDefaultRisk] = useState(null);
  const [segment, setSegment] = useState(null);
  const [matches, setMatches] = useState([]);
  const [tontines, setTontines] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [selectedTontine, setSelectedTontine] = useState('');
  const [showRaw, setShowRaw] = useState({});

  useEffect(() => {
    api.get('/ml/models').then((r) => setModels(r.data));
    api.get('/ml/default-risk/me').then((r) => setDefaultRisk(r.data));
    api.get('/ml/segment/me').then((r) => setSegment(r.data));
    api.get('/ml/matching/recommend?top=5').then((r) => setMatches(r.data));
    api.get('/tontines').then((r) => setTontines(r.data));
  }, []);

  useEffect(() => {
    if (!selectedTontine) return;
    api.get(`/ml/forecast/tontine/${selectedTontine}`).then((r) => setForecast(r.data));
  }, [selectedTontine]);

  const toggle = (k) => setShowRaw({ ...showRaw, [k]: !showRaw[k] });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="text-primary-600" size={28} />
        <div>
          <h1 className="text-3xl font-bold">Intelligence Artificielle</h1>
          <p className="text-slate-500 mt-1">6 modèles ML au service de votre expérience.</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-800">
        <Info size={17} className="shrink-0 mt-1 text-indigo-500" />
        <div className="space-y-1">
          <p><span className="font-semibold">À quoi sert cette page ?</span> L'IA analyse votre comportement financier pour vous donner des informations personnalisées.</p>
          <p><span className="font-semibold">Risque de défaut :</span> Probabilité que vous manquiez votre prochaine cotisation. Plus il est bas, mieux c'est.</p>
          <p><span className="font-semibold">Archétype :</span> Votre profil d'épargnant parmi 5 catégories — avec des conseils adaptés à votre situation.</p>
          <p><span className="font-semibold">Membres compatibles :</span> L'IA recommande des personnes fiables avec qui former une tontine, basé sur la compatibilité de profil.</p>
          <p><span className="font-semibold">Prévision :</span> Sélectionnez une tontine pour voir combien de cotisations sont attendues sur les prochains cycles.</p>
        </div>
      </div>

      {/* Modèles disponibles */}
      <div className="card p-5">
        <div className="font-semibold mb-3 flex items-center gap-2">
          <Shield size={18} /> Modèles ML disponibles
        </div>
        {!models ? <div className="text-slate-400 text-sm">Chargement…</div> : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {models.models?.map((m) => (
              <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <div className="font-medium capitalize">{m.name.replace('_', ' ')}</div>
                  <div className="text-xs text-slate-500 font-mono">{m.file}</div>
                </div>
                <span className={`badge ${m.loaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {m.loaded ? 'chargé' : 'fallback'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default Risk */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2">
            <TrendingDown size={18} className="text-red-500" /> Risque de défaut sur prochaine cotisation
          </div>
          <span className="text-xs text-slate-500">Modèle : Gradient Boosting</span>
        </div>
        {!defaultRisk ? <div className="text-slate-400 text-sm">Calcul…</div> : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold" style={{
                color: defaultRisk.risk_level === 'high' ? '#ef4444' :
                  defaultRisk.risk_level === 'medium' ? '#f59e0b' : '#10b981',
              }}>
                {(defaultRisk.default_probability * 100).toFixed(1)}%
              </div>
              <div>
                <div className="text-sm font-medium">Niveau : <span className="capitalize">{defaultRisk.risk_level}</span></div>
                <div className="text-xs text-slate-500">{defaultRisk.recommendation}</div>
              </div>
            </div>
            {defaultRisk.top_features?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Facteurs influents (importance ML) :</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={defaultRisk.top_features.map((f) => ({ ...f, importance: +(f.importance * 100).toFixed(1) }))} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="importance" fill="#1F4E79" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <button onClick={() => toggle('risk')} className="text-xs text-primary-600 flex items-center gap-1">
              {showRaw.risk ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Données brutes
            </button>
            {showRaw.risk && <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(defaultRisk, null, 2)}</pre>}
          </div>
        )}
      </div>

      {/* Segmentation */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2">
            <Users size={18} className="text-primary-600" /> Votre archétype utilisateur
          </div>
          <span className="text-xs text-slate-500">Modèle : KMeans (5 clusters)</span>
        </div>
        {!segment ? <div className="text-slate-400 text-sm">Calcul…</div> : (
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: segment.color }}>
              {segment.cluster}
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold">{segment.archetype}</div>
              <div className="text-sm text-slate-600 mt-1">{segment.description}</div>
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Actions recommandées :</div>
                <ul className="text-sm text-slate-700 list-disc list-inside">
                  {segment.actions?.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div className="text-xs text-slate-400 mt-2">Confiance: {(segment.confidence * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Matching / Recommendations */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2">
            <Target size={18} className="text-primary-600" /> Membres compatibles recommandés
          </div>
          <span className="text-xs text-slate-500">Algorithme : similarité cosinus + score de fiabilité</span>
        </div>
        {matches.length === 0 ? (
          <div className="text-slate-400 text-sm">Aucune recommandation pour l'instant.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {matches.map((m) => (
              <li key={m.user_id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.full_name}</div>
                  <div className="text-xs text-slate-500">{m.explanation}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-primary-600 h-2" style={{ width: `${m.compatibility_score}%` }} />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{m.compatibility_score}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Forecast */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Prévision de flux de trésorerie
          </div>
          <span className="text-xs text-slate-500">Modèle : Régression linéaire</span>
        </div>
        <select className="input mb-3 max-w-md" value={selectedTontine} onChange={(e) => setSelectedTontine(e.target.value)}>
          <option value="">— Choisir une tontine —</option>
          {tontines.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {forecast && forecast.forecast?.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm">
              Total attendu sur les <strong>{forecast.horizon}</strong> cycles restants :
              <strong className="text-primary-600 ml-1">{formatMoney(forecast.expected_total)}</strong>
              <span className="text-slate-500"> (idéal : {formatMoney(forecast.ideal_total)})</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecast.forecast.map((f) => ({
                cycle: `C${f.cycle_index}`,
                attendu: f.expected_amount / 100,
                low: f.ci_low / 100,
                high: f.ci_high / 100,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cycle" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendu" stroke="#1F4E79" strokeWidth={2} />
                <Line type="monotone" dataKey="low" stroke="#94a3b8" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="high" stroke="#94a3b8" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : selectedTontine ? (
          <div className="text-slate-400 text-sm">Aucune prévision (tontine déjà terminée ou non démarrée).</div>
        ) : null}
      </div>

      {/* Dispute classifier — outil interactif */}
      <DisputeClassifier />
    </div>
  );
}

function DisputeClassifier() {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const classify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/ml/dispute/classify', { reason, description });
      setResult(data);
    } finally { setLoading(false); }
  };

  const colors = {
    fraude_suspectee: 'bg-red-100 text-red-800',
    probleme_versement: 'bg-orange-100 text-orange-800',
    paiement_manquant: 'bg-amber-100 text-amber-800',
    retard_recurrent: 'bg-yellow-100 text-yellow-800',
    communication: 'bg-blue-100 text-blue-800',
    autre: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold flex items-center gap-2">
          <Brain size={18} className="text-primary-600" /> Classifieur NLP de litiges
        </div>
        <span className="text-xs text-slate-500">Modèle : TF-IDF + Naive Bayes</span>
      </div>
      <form onSubmit={classify} className="space-y-3">
        <input className="input" placeholder="Raison (ex: paiement manquant depuis 2 mois)"
          value={reason} onChange={(e) => setReason(e.target.value)} />
        <textarea className="input" rows={2} placeholder="Description (optionnelle)"
          value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="btn-primary" disabled={!reason || loading}>
          {loading ? 'Classification…' : 'Classifier'}
        </button>
      </form>
      {result && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50">
          <div className="flex items-center gap-2">
            <span className={`badge ${colors[result.category]}`}>{result.label}</span>
            <span className="text-xs text-slate-500">priorité {result.priority} · confiance {(result.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="text-sm text-slate-700 mt-2">
            <strong>Action suggérée :</strong> {result.suggested_action}
          </div>
        </div>
      )}
    </div>
  );
}
