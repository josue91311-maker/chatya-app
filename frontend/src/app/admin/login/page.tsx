'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, MessageSquare, AlertCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function LoginForm() {
  const [email, setEmail] = useState('admin@chatya.com');
  const [password, setPassword] = useState('chatya123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiredMsg, setExpiredMsg] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setExpiredMsg(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('username', email);
      form.append('password', password);

      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Credenciales incorrectas');
      }

      const data = await res.json();
      localStorage.setItem('chatya_token', data.access_token);

      // Get user info
      const meRes = await fetch(`${API}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (meRes.ok) {
        const user = await meRes.json();
        localStorage.setItem('chatya_user', JSON.stringify(user));
        localStorage.setItem('chatya_company_slug', user.company_slug || 'demo');
        localStorage.setItem('chatya_company_name', user.company_name || 'Mi Empresa');
      }

      router.replace('/admin');
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-violet">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ChatYa</h1>
          <p className="text-gray-500 text-sm mt-1">Panel de Administración</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          {expiredMsg && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Tu sesión ha expirado. Por favor inicia sesión de nuevo.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="input-label">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@chatya.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="input-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-dark py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Ingresando...
                </>
              ) : (
                'Ingresar al panel'
              )}
            </button>
          </form>

          {/* Quick role test switcher */}
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <p className="text-xs text-slate-800 font-bold">Probar perfiles de usuario:</p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@chatya.com');
                  setPassword('chatya123');
                }}
                className="text-left px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors text-xs font-bold text-violet-900 flex items-center justify-between"
              >
                <span>👑 ADM (Acceso Total + Usuarios)</span>
                <span className="text-[10px] text-violet-600 font-normal">admin@chatya.com</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('ventas@chatya.com');
                  setPassword('ventas123');
                }}
                className="text-left px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors text-xs font-bold text-emerald-900 flex items-center justify-between"
              >
                <span>🛒 Ventas (Pedidos & Clientes)</span>
                <span className="text-[10px] text-emerald-600 font-normal">ventas@chatya.com</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('logistica@chatya.com');
                  setPassword('logistica123');
                }}
                className="text-left px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors text-xs font-bold text-blue-900 flex items-center justify-between"
              >
                <span>📦 Logística (Productos & Stock)</span>
                <span className="text-[10px] text-blue-600 font-normal">logistica@chatya.com</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ChatYa — Plataforma SaaS de Ventas por WhatsApp
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
