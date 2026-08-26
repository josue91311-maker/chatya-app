'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Percent, Plus, Pencil, Trash2, Loader2, Tag, Check, AlertCircle, RefreshCw, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('chatya_token');
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

const PROMO_TYPES = [
  { value: '2x1', label: '2x1 — Lleva 2, paga 1' },
  { value: '3x2', label: '3x2 — Lleva 3, paga 2' },
  { value: 'percentage', label: 'Descuento %' },
  { value: 'fixed', label: 'Descuento Fijo (S/)' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  promotion_type: 'percentage',
  discount_value: 10,
  is_active: true,
};

export default function PromotionsPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchPromos = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/promotions/`, { headers });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setPromos(d.data || d || []);
      } else {
        setErrorMsg('Error al cargar las promociones.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      promotion_type: p.promotion_type || 'percentage',
      discount_value: p.discount_value ?? 10,
      is_active: p.is_active ?? true,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('El nombre de la promoción es obligatorio');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const url = editing
        ? `${API}/api/v1/promotions/${editing.id}`
        : `${API}/api/v1/promotions/`;
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'No se pudo guardar la promoción.');
      }

      setSuccessMsg(editing ? 'Promoción actualizada ✓' : 'Promoción creada ✓');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchPromos();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar la promoción.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo: any) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/promotions/${promo.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !promo.is_active }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      fetchPromos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/promotions/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      setSuccessMsg('Promoción eliminada ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchPromos();
    } catch (e) {
      console.error(e);
      setErrorMsg('Error al eliminar la promoción.');
    }
  };

  const typeLabel = (type: string) => PROMO_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-gray-500 text-sm mt-0.5">Crea descuentos y ofertas especiales para tus productos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPromos} className="btn-outline text-sm px-3 py-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn-primary text-sm px-4 py-2">
            <Plus className="w-4 h-4" /> Nueva Promoción
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 border-2 border-violet-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">
              {editing ? `Editando: ${editing.name}` : 'Nueva Promoción'}
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nombre de la promoción *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="ej. Oferta de fin de semana"
              />
            </div>
            <div>
              <label className="input-label">Tipo de Promoción *</label>
              <select
                value={form.promotion_type}
                onChange={e => setForm((f: any) => ({ ...f, promotion_type: e.target.value }))}
                className="input"
              >
                {PROMO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {(form.promotion_type === 'percentage' || form.promotion_type === 'fixed') && (
              <div>
                <label className="input-label">
                  {form.promotion_type === 'percentage' ? 'Descuento (%)' : 'Descuento (S/)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount_value}
                  onChange={e => setForm((f: any) => ({ ...f, discount_value: Number(e.target.value) }))}
                  className="input"
                />
              </div>
            )}
            <div className={form.promotion_type === 'percentage' || form.promotion_type === 'fixed' ? '' : 'sm:col-span-2'}>
              <label className="input-label">Descripción</label>
              <input
                value={form.description}
                onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                className="input"
                placeholder="Describe la promoción para tus clientes..."
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-violet-600"
                />
                Activa inmediatamente
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-dark text-sm px-5 py-2 font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Guardar Cambios' : 'Crear Promoción')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-5"><div className="skeleton h-32 rounded-xl" /></div>
          ))
        ) : promos.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 card p-12 text-center">
            <Percent className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No hay promociones activas</p>
            <button onClick={openCreate} className="mt-4 text-sm text-violet-600 font-semibold">+ Crear primera promoción</button>
          </div>
        ) : (
          promos.map((p: any) => (
            <div key={p.id} className={`card p-5 border-2 ${p.is_active ? 'border-violet-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-violet-600" />
                </div>
                <button
                  onClick={() => toggleActive(p)}
                  className={`badge cursor-pointer ${p.is_active ? 'badge-green' : 'badge-gray'}`}
                >
                  {p.is_active ? '● Activa' : '○ Inactiva'}
                </button>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{p.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{p.description || typeLabel(p.promotion_type)}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="badge badge-violet">{typeLabel(p.promotion_type)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                    title="Editar promoción"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Eliminar promoción"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
