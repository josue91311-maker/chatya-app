'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Phone, Loader2, Plus, Pencil, Trash2,
  X, Check, AlertCircle, RefreshCw, Mail, UserPlus,
} from 'lucide-react';

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
  full_name: '',
  whatsapp_number: '',
  email: '',
};

export default function ClientesPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
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
    fetchCustomers();
  }, []);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/customers/?limit=100`, { headers });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.data || d || []);
      } else {
        setErrorMsg('Error al cargar la lista de clientes.');
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

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      full_name: c.full_name || '',
      whatsapp_number: c.whatsapp_number || '',
      email: c.email || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setErrorMsg('El nombre del cliente es obligatorio');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const url = editing
        ? `${API}/api/v1/customers/${editing.id}`
        : `${API}/api/v1/customers/`;
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
        throw new Error(err.detail || err.message || 'No se pudo guardar el cliente.');
      }

      setSuccessMsg(editing ? 'Cliente actualizado ✓' : 'Cliente registrado ✓');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCustomers();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al registrar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/customers/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      setDeleteId(null);
      setSuccessMsg('Cliente eliminado ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCustomers();
    } catch (e) {
      console.error(e);
      setErrorMsg('Error al eliminar cliente.');
    }
  };

  const openWhatsApp = (number: string) => {
    if (!number || number === '00000000000') return;
    window.open(`https://wa.me/${number.replace(/\D/g, '')}`, '_blank');
  };

  const filtered = customers.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.whatsapp_number?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestión manual y registro automático de compras
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCustomers} className="btn-outline text-sm px-3 py-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn-primary text-sm px-4 py-2">
            <UserPlus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Form modal/card */}
      {showForm && (
        <div className="card p-6 border-2 border-violet-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">
              {editing ? `Editando: ${editing.full_name}` : 'Registrar Nuevo Cliente'}
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nombre completo del cliente *</label>
              <input
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="input"
                placeholder="ej. Carlos Mendoza"
              />
            </div>
            <div>
              <label className="input-label">WhatsApp (con código de país sin +)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={form.whatsapp_number}
                  onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value.replace(/\D/g, '') }))}
                  className="input pl-9"
                  placeholder="51999999999"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="input-label">Correo electrónico (opcional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input pl-9"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-dark px-5 py-2 text-sm font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Guardar Cambios' : 'Registrar Cliente')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Clientes', value: customers.length },
          { label: 'Con compras completadas', value: customers.filter(c => (c.total_orders || 0) > 0).length },
          {
            label: 'Promedio compras por cliente',
            value: customers.length > 0
              ? (customers.reduce((s, c) => s + (c.total_orders || 0), 0) / customers.length).toFixed(1)
              : '0',
          },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar cliente por nombre o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-violet-500 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              {search ? 'No se encontraron clientes' : 'Aún no hay clientes registrados'}
            </p>
            <button onClick={openCreate} className="mt-3 text-sm text-violet-600 font-semibold">
              + Registrar primer cliente manualmente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  {['Cliente', 'WhatsApp', 'Pedidos', 'Total Gastado', 'Último Pedido', 'Acciones'].map(h => (
                    <th key={h} className="table-cell text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const isDefaultCustomer = c.full_name === 'CLIENTES VARIOS';
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                            isDefaultCustomer ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-700'
                          }`}>
                            {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {c.full_name}
                              {isDefaultCustomer && (
                                <span className="badge badge-yellow text-[10px]">Cliente por defecto</span>
                              )}
                            </div>
                            {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600 font-mono text-xs">
                        {c.whatsapp_number && c.whatsapp_number !== '00000000000' ? (
                          `+${c.whatsapp_number}`
                        ) : (
                          <span className="text-gray-300">Sin número</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-violet">{c.total_orders || 0} pedidos</span>
                      </td>
                      <td className="table-cell font-bold text-gray-900">
                        S/ {Number(c.total_spent || 0).toFixed(2)}
                      </td>
                      <td className="table-cell text-gray-400 text-xs">
                        {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('es-PE') : '—'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          {c.whatsapp_number && c.whatsapp_number !== '00000000000' && (
                            <button
                              onClick={() => openWhatsApp(c.whatsapp_number)}
                              className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg hover:bg-green-100 font-medium"
                              title="Escribir por WhatsApp"
                            >
                              <Phone className="w-3 h-3" /> Escribir
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {!isDefaultCustomer && (
                            deleteId === c.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDelete(c.id)}
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
                                onClick={() => setDeleteId(c.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-violet-800 space-y-1">
        <p className="font-bold">💡 ¿Cómo se registran los clientes?</p>
        <p>
          1. <strong>Automático:</strong> Cada vez que un comprador finaliza su pedido desde la tienda web, el sistema verifica su WhatsApp. Si es nuevo, lo registra automáticamente. Si ya existe, le suma su compra.
        </p>
        <p>
          2. <strong>Manual:</strong> Puedes usar el botón <strong>+ Nuevo Cliente</strong> arriba para registrar clientes manualmente antes de que hagan sus pedidos.
        </p>
        <p>
          3. <strong>CLIENTES VARIOS:</strong> Es el perfil por defecto para pedidos anónimos donde el cliente decidió no brindar sus datos personales.
        </p>
      </div>
    </div>
  );
}
