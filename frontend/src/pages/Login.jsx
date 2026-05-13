import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Coins, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', otp: '' });
  const [needsOtp, setNeedsOtp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password, form.otp || undefined);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.twofaRequired) setNeedsOtp(true);
      else setError(err.response?.data?.error || 'Identifiants incorrects.');
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
            Épargnez ensemble,<br />progressez ensemble.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            La plateforme intelligente pour gérer vos tontines en toute confiance, partout dans le monde.
          </p>
        </div>
        <p className="text-white/30 text-sm">© 2025 TontineDigital · Tous droits réservés</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
              <p className="text-slate-500 text-sm mt-1">Accédez à votre espace personnel.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input className="input" type="email" value={form.email} onChange={set('email')}
                  placeholder="vous@exemple.com" required autoComplete="email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
                <input className="input" type="password" value={form.password} onChange={set('password')}
                  placeholder="••••••••" required autoComplete="current-password" />
              </div>
              {needsOtp && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Code 2FA</label>
                  <input className="input" placeholder="123456" value={form.otp} onChange={set('otp')}
                    maxLength={6} inputMode="numeric" required />
                </div>
              )}
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
                    Connexion…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">Se connecter <ArrowRight size={16} /></span>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">Créer un compte</Link>
            </p>

            <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Comptes de démo</p>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>alice@demo.com</span><span className="text-slate-400">demo1234</span>
                </div>
                <div className="flex justify-between">
                  <span>admin@tontinedigital.com</span><span className="text-slate-400">admin1234</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
