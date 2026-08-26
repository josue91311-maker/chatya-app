'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Plus, Pencil, Trash2, Loader2, Check, AlertCircle, RefreshCw, X, Search } from 'lucide-react';

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

const EMPTY_FORM = {
  name: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchBrands = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/brands/`, { headers });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setBrands(d.data || d || []);
      } else {
        setErrorMsg('Error al cargar las marcas.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión al cargar marcas.');
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

  const openEdit = (brand: any) => {
    setEditing(brand);
    setForm({
      name: brand.name || '',
      description: brand.description || '',
      is_active: brand.is_active ?? true,
      sort_order: brand.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('El nombre de la marca es obligatorio.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const url = editing
        ? `${API}/api/v1/brands/${editing.id}`
        : `${API}/api/v1/brands/`;
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
        throw new Error(err.detail || err.message || 'No se pudo guardar la marca.');
      }

      setSuccessMsg(editing ? 'Marca actualizada ✓' : 'Marca creada ✓');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchBrands();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar la marca.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: any) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/brands/${b.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !b.is_active }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      fetchBrands();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/brands/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      setDeleteId(null);
      setSuccessMsg('Marca eliminada ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchBrands();
    } catch (e) {
      console.error(e);
      setErrorMsg('Error al eliminar la marca.');
    }
  };

  const filtered = brands.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.description || '').toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Maestro de Marcas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Administra y edita las marcas de tus productos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchBrands} className="btn-outline text-sm px-3 py-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 font-semibold">
            <Plus className="w-4 h-4" /> Nueva Marca
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 border-2 border-violet-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">
              {editing ? `Editando: ${editing.name}` : 'Nueva Marca'}
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nombre de la marca *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="ej. Nike, Samsung, Gloria, Nestle, Adidas..."
              />
            </div>
            <div>
              <label className="input-label">Descripción (opcional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input"
                placeholder="ej. Productos electrónicos y tecnología"
              />
            </div>
            <div>
              <label className="input-label">Orden de ordenamiento</label>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                className="input"
                placeholder="0"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-violet-600"
                />
                <span className="text-sm font-medium text-gray-700">Marca activa</span>
              </label>
            </div>

            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-4 py-2">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-dark text-sm px-5 py-2 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Guardar Cambios' : 'Crear Marca')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar marca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* List Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-violet-500 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bookmark className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {search ? 'No se encontraron marcas con ese término' : 'Aún no hay marcas registradas'}
            </p>
            <button onClick={openCreate} className="mt-3 text-sm text-violet-600 font-bold">
              + Crear primera marca
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="table-cell text-left font-medium text-gray-500">Marca</th>
                <th className="table-cell text-left font-medium text-gray-500">Slug</th>
                <th className="table-cell text-left font-medium text-gray-500">Descripción</th>
                <th className="table-cell text-left font-medium text-gray-500">Estado (Activo)</th>
                <th className="table-cell text-left font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900">{b.name}</span>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-gray-400 text-xs">{b.slug}</td>
                  <td className="table-cell text-gray-500">{b.description || '—'}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleActive(b)}
                      className={`badge cursor-pointer ${b.is_active ? 'badge-green' : 'badge-gray'}`}
                      title="Haz clic para cambiar estado"
                    >
                      {b.is_active ? '● Activa' : '○ Inactiva'}
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                        title="Editar marca"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteId === b.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100"
                          >
                            ¿Eliminar?
                          </button>
                          <button onClick={() => setDeleteId(null)} className="text-xs text-gray-500 px-1 py-1">
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(b.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar marca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
