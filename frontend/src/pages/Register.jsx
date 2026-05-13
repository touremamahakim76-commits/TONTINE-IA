import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Coins, ArrowRight } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Coins size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">TontineDigital</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-snug mb-4">
            Rejoignez des milliers<br />d'épargnants.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Créez votre compte en 30 secondes et commencez à épargner collectivement en toute sécurité.
          </p>
        </div>
        <p className="text-white/30 text-sm">© 2025 TontineDigital · Tous droits réservés</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900">Créer un compte</h1>
              <p className="text-slate-500 text-sm mt-1">Gratuit et sans engagement.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom complet</label>
                <input className="input" value={form.full_name} onChange={set('full_name')}
                  placeholder="Prénom Nom" required minLength={2} autoComplete="name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input className="input" type="email" value={form.email} onChange={set('email')}
                  placeholder="vous@exemple.com" required autoComplete="email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Téléphone <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <input className="input" type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="+33 6 00 00 00 00" autoComplete="tel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
                <input className="input" type="password" value={form.password} onChange={set('password')}
                  placeholder="Minimum 8 caractères" required minLength={8} autoComplete="new-password" />
              </div>

              {error && (
                <div className="alert-error flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 mt-1 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Création…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">Créer mon compte <ArrowRight size={16} /></span>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
