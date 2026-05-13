export const formatMoney = (cents, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format((cents || 0) / 100);

export const formatDate = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const statusLabel = {
  pending: 'En attente',
  active: 'Active',
  collecting: 'Collecte en cours',
  paid_out: 'Versée',
  paid: 'Payée',
  failed: 'Échec',
  completed: 'Terminée',
  cancelled: 'Annulée',
  invited: 'Invité',
  accepted: 'Membre',
  declined: 'Refusée',
  removed: 'Retiré',
};

export const statusColor = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  collecting: 'bg-blue-100 text-blue-800',
  paid_out: 'bg-emerald-100 text-emerald-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
  invited: 'bg-amber-100 text-amber-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
};
