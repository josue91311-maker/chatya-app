'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Plus, Pencil, Trash2, Loader2, Check, AlertCircle, RefreshCw, X } from 'lucide-react';

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

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchCategories = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/categories/`, { headers });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setCategories(d.data || d || []);
      } else {
        setErrorMsg('Error al obtener las categorías.');
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

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      is_active: cat.is_active ?? true,
      sort_order: cat.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('El nombre de la categoría es obligatorio');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const url = editing
        ? `${API}/api/v1/categories/${editing.id}`
        : `${API}/api/v1/categories/`;
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
        throw new Error(err.detail || err.message || 'No se pudo guardar la categoría.');
      }

      setSuccessMsg(editing ? 'Categoría actualizada ✓' : 'Categoría creada ✓');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCategories();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: any) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/categories/${cat.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      fetchCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/categories/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      setDeleteId(null);
      setSuccessMsg('Categoría eliminada ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCategories();
    } catch (e) {
      console.error(e);
      setErrorMsg('Error al eliminar la categoría.');
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-gray-500 text-sm mt-0.5">Organiza tus productos por categorías</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCategories} className="btn-outline text-sm px-3 py-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn-primary text-sm px-4 py-2">
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 border-2 border-violet-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">
              {editing ? `Editando: ${editing.name}` : 'Nueva Categoría'}
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nombre de la categoría *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="ej. Bebidas, Calzado, Electrónica..."
              />
            </div>
            <div>
              <label className="input-label">Descripción (opcional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input"
                placeholder="ej. Bebidas frías y refrescos"
              />
            </div>
            <div>
              <label className="input-label">Orden de aparición</label>
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
                <span className="text-sm font-medium text-gray-700">Categoría activa en tienda</span>
              </label>
            </div>

            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-4 py-2">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-dark text-sm px-5 py-2 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Guardar Cambios' : 'Crear Categoría')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-violet-500 mx-auto" /></div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No hay categorías registradas</p>
            <button onClick={openCreate} className="mt-4 text-sm text-violet-600 font-semibold">+ Crear primera categoría</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="table-cell text-left font-medium text-gray-500">Categoría</th>
                <th className="table-cell text-left font-medium text-gray-500">Slug</th>
                <th className="table-cell text-left font-medium text-gray-500">Descripción</th>
                <th className="table-cell text-left font-medium text-gray-500">Estado (Activo)</th>
                <th className="table-cell text-left font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: any) => (
                <tr key={cat.id} className="table-row">
                  <td className="table-cell font-semibold text-gray-900">{cat.name}</td>
                  <td className="table-cell font-mono text-gray-400 text-xs">{cat.slug}</td>
                  <td className="table-cell text-gray-500">{cat.description || '—'}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`badge cursor-pointer ${cat.is_active ? 'badge-green' : 'badge-gray'}`}
                      title="Haz clic para cambiar estado"
                    >
                      {cat.is_active ? '● Activa' : '○ Inactiva'}
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                        title="Editar categoría"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteId === cat.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(cat.id)}
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
                          onClick={() => setDeleteId(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar categoría"
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
