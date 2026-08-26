'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Plus, Search, Pencil, Trash2, Loader2,
  Check, X, AlertCircle, RefreshCw, Key, UserCheck,
  UserX, Lock, Mail, User as UserIcon, Shield,
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

const ROLES_INFO = [
  {
    id: 'admin',
    label: 'Administrador (ADM)',
    icon: '👑',
    color: 'bg-violet-100 text-violet-800 border-violet-300',
    description: 'Acceso total a todo el sistema: creación y edición de usuarios, configuración general, reportes y todos los módulos.',
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: '🛒',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Permiso para hacer pedidos, ver y modificar pedidos, crear y editar clientes y consultar el dashboard de ventas.',
  },
  {
    id: 'logistica',
    label: 'Logística',
    icon: '📦',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Permiso para gestión de productos, precios por factores, control de inventario/stock, categorías y marcas.',
  },
];

export default function UsersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  // Form & Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ventas');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const userRaw = localStorage.getItem('chatya_user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        setCurrentAdminId(u.id);
      } catch (e) {
        console.error(e);
      }
    }
    fetchUsers();
  }, []);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado o no tienes permisos de Administrador.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/users/`, { headers });
      if (res.status === 401 || res.status === 403) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setUsers(d.data || []);
      } else {
        setErrorMsg('Error al cargar la lista de usuarios.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('ventas');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setFullName(u.full_name || '');
    setEmail(u.email || '');
    setPassword(''); // leave blank if not changing
    setRole(u.role || 'ventas');
    setIsActive(Boolean(u.is_active));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('El correo electrónico es obligatorio.');
      return;
    }
    if (!editingUser && (!password.trim() || password.length < 6)) {
      setErrorMsg('La contraseña inicial debe tener al menos 6 caracteres.');
      return;
    }
    if (editingUser && password.trim() && password.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const payload: any = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: role.toLowerCase(),
        is_active: isActive,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const url = editingUser ? `${API}/api/v1/users/${editingUser.id}` : `${API}/api/v1/users/`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Error al guardar el usuario.');
      }

      setSuccessMsg(
        editingUser
          ? `Usuario "${fullName}" actualizado correctamente ✓`
          : `Usuario "${fullName}" creado exitosamente ✓`
      );
      setShowModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 401 || res.status === 403) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'No se pudo eliminar el usuario.');
      }
      setDeleteId(null);
      setSuccessMsg('Usuario eliminado correctamente ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchUsers();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al eliminar el usuario.');
    }
  };

  const toggleUserStatus = async (user: any) => {
    if (user.id === currentAdminId) {
      setErrorMsg('No puedes desactivar tu propia cuenta de Administrador.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/users/${user.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      !s ||
      (u.full_name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.role || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-violet-600" />
            Gestión de Usuarios & Perfiles
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Administra los usuarios con sus 3 perfiles de acceso: <strong>ADM (Acceso Total)</strong>, <strong>Ventas</strong> y <strong>Logística</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            className="btn-outline text-xs px-3.5 py-2 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={openCreateModal}
            className="btn-dark text-xs px-4 py-2 font-bold flex items-center gap-1.5 rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Profiles Info Cards Banner */}
      <div className="grid sm:grid-cols-3 gap-3">
        {ROLES_INFO.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm space-y-1.5 hover:border-slate-400 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{r.icon}</span>
              <h3 className="font-extrabold text-slate-900 text-xs">{r.label}</h3>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, correo o perfil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10 bg-white"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden border border-gray-200 shadow-sm rounded-3xl">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 mx-auto" />
            <p className="text-xs text-gray-400 mt-2 font-medium">Cargando usuarios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl m-4">
            <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-bold text-sm">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-left">Usuario</th>
                  <th className="py-3.5 px-4 text-left">Correo Electrónico</th>
                  <th className="py-3.5 px-4 text-left">Perfil / Rol</th>
                  <th className="py-3.5 px-4 text-left">Estado</th>
                  <th className="py-3.5 px-4 text-left">Fecha Registro</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u: any) => {
                  const roleObj = ROLES_INFO.find((r) => r.id === (u.role || '').toLowerCase()) || {
                    label: u.role || 'Ventas',
                    icon: '👤',
                    color: 'bg-gray-100 text-gray-800 border-gray-300',
                  };
                  const isSelf = u.id === currentAdminId;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            {(u.full_name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {u.full_name} {isSelf && <span className="text-[10px] text-violet-600 font-black">(Tú)</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-gray-600">{u.email}</td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border ${roleObj.color}`}
                        >
                          <span>{roleObj.icon}</span>
                          <span>{roleObj.label}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          disabled={isSelf}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          } ${isSelf ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isSelf ? 'No puedes cambiar tu propio estado' : 'Clic para cambiar estado'}
                        >
                          {u.is_active ? '● Activo' : '○ Inactivo'}
                        </button>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-gray-400 font-medium">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es-PE') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-slate-900 transition-colors"
                            title="Editar usuario o cambiar contraseña"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {!isSelf && (
                            <>
                              {deleteId === u.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(u.id)}
                                    className="text-xs text-red-600 font-bold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100"
                                  >
                                    ¿Confirmar?
                                  </button>
                                  <button
                                    onClick={() => setDeleteId(null)}
                                    className="text-xs text-gray-500 px-1 py-1"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteId(u.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
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

      {/* ===== CREATE / EDIT USER MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  {editingUser ? `Editar Usuario: ${editingUser.full_name}` : 'Crear Nuevo Usuario'}
                </h3>
                <p className="text-xs text-gray-500">
                  Define las credenciales de acceso y asigna uno de los 3 perfiles disponibles.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="input-label font-bold text-slate-900">Nombre Completo *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input pl-9 font-semibold"
                    placeholder="ej. Juan Pérez, María Gómez..."
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="input-label font-bold text-slate-900">Correo Electrónico *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9 font-mono"
                    placeholder="usuario@empresa.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="input-label font-bold text-slate-900">
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña Inicial *'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-9"
                    placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                  />
                </div>
              </div>

              {/* Role / Profile Selector Cards */}
              <div className="space-y-2 pt-2">
                <label className="input-label font-bold text-slate-900">Selecciona el Perfil de Usuario *</label>
                <div className="space-y-2">
                  {ROLES_INFO.map((r) => {
                    const isSelected = role === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                            : 'bg-slate-50 border-gray-200 hover:border-gray-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs flex items-center gap-1.5">
                            <span>{r.icon}</span> {r.label}
                          </span>
                          <input
                            type="radio"
                            name="role_selection"
                            checked={isSelected}
                            onChange={() => setRole(r.id)}
                            className="w-4 h-4 accent-slate-900 cursor-pointer"
                          />
                        </div>
                        <p
                          className={`text-[11px] mt-1 ${
                            isSelected ? 'text-slate-300' : 'text-gray-500'
                          }`}
                        >
                          {r.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl cursor-pointer border border-gray-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-800">Usuario Activo (Permitir Iniciar Sesión)</span>
              </label>

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline px-4 py-2.5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-dark px-5 py-2.5 text-xs font-bold flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : editingUser ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
