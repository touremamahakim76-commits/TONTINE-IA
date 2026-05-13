import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tontines from './pages/Tontines';
import TontineDetail from './pages/TontineDetail';
import CreateTontine from './pages/CreateTontine';
import Payments from './pages/Payments';
import Score from './pages/Score';
import Disputes from './pages/Disputes';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import MLInsights from './pages/MLInsights';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { init } = useAuth();
  useEffect(() => { init(); }, [init]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/tontines" element={<Protected><Tontines /></Protected>} />
      <Route path="/tontines/new" element={<Protected><CreateTontine /></Protected>} />
      <Route path="/tontines/:id" element={<Protected><TontineDetail /></Protected>} />
      <Route path="/payments" element={<Protected><Payments /></Protected>} />
      <Route path="/score" element={<Protected><Score /></Protected>} />
      <Route path="/disputes" element={<Protected><Disputes /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/ml" element={<Protected><MLInsights /></Protected>} />
      <Route path="/admin" element={<Protected><Admin /></Protected>} />
    </Routes>
  );
}
