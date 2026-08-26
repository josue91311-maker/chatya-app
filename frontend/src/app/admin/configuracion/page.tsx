'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Store, CreditCard, Truck, Receipt, Save, Loader2,
  Plus, Trash2, Check, AlertCircle, RefreshCw, Clock, Pencil, X, MapPin,
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

type Tab = 'empresa' | 'horario' | 'entrega' | 'pago' | 'recibos';

const DAYS_MAP: { key: string; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_HOURS = {
  monday: { open: '08:00', close: '20:00', is_active: true },
  tuesday: { open: '08:00', close: '20:00', is_active: true },
  wednesday: { open: '08:00', close: '20:00', is_active: true },
  thursday: { open: '08:00', close: '20:00', is_active: true },
  friday: { open: '08:00', close: '22:00', is_active: true },
  saturday: { open: '09:00', close: '22:00', is_active: true },
  sunday: { open: '09:00', close: '18:00', is_active: true },
};

export default function ConfiguracionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('empresa');
  const [config, setConfig] = useState<any>({});
  const [company, setCompany] = useState<any>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [businessHours, setBusinessHours] = useState<any>(DEFAULT_HOURS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment method form & editing
  const [showPMForm, setShowPMForm] = useState(false);
  const [editingPM, setEditingPM] = useState<any>(null);
  const [pmForm, setPmForm] = useState({ name: '', type: 'transfer', instructions: '', is_active: true });
  const [savingPM, setSavingPM] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      localStorage.removeItem('chatya_user');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      if (!headers.Authorization) {
        handleUnauthorized();
        return;
      }

      const [cfgRes, pmRes] = await Promise.all([
        fetch(`${API}/api/v1/config/company`, { headers }),
        fetch(`${API}/api/v1/config/payment-methods`, { headers }),
      ]);

      if (cfgRes.status === 401 || pmRes.status === 401) {
        handleUnauthorized();
        return;
      }

      if (cfgRes.ok) {
        const d = await cfgRes.json();
        const full = d.data || d;
        setConfig(full.config || {});
        setCompany(full.company || full);
        if (full.company?.business_hours) {
          setBusinessHours(full.company.business_hours);
        }
      } else {
        setErrorMsg('No se pudo cargar la configuración de la empresa.');
      }

      if (pmRes.ok) {
        const d = await pmRes.json();
        setPaymentMethods(d.data || d || []);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const headers = getAuthHeader();
      if (!headers.Authorization) {
        handleUnauthorized();
        return;
      }

      const payload = {
        company: {
          ...company,
          business_hours: businessHours,
        },
        config,
      };

      const res = await fetch(`${API}/api/v1/config/company`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudieron guardar los cambios.');
      }

      setSuccessMsg('Configuración e Horario guardados correctamente ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  // Payment Methods Handlers
  const openCreatePM = () => {
    setEditingPM(null);
    setPmForm({ name: '', type: 'transfer', instructions: '', is_active: true });
    setShowPMForm(true);
  };

  const openEditPM = (pm: any) => {
    setEditingPM(pm);
    setPmForm({
      name: pm.name || '',
      type: pm.type || 'transfer',
      instructions: pm.instructions || '',
      is_active: pm.is_active ?? true,
    });
    setShowPMForm(true);
  };

  const savePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmForm.name.trim()) {
      setErrorMsg('El nombre del método de pago es obligatorio.');
      return;
    }

    setSavingPM(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const url = editingPM
        ? `${API}/api/v1/config/payment-methods/${editingPM.id}`
        : `${API}/api/v1/config/payment-methods`;
      const method = editingPM ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(pmForm),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo guardar el método de pago.');
      }

      setShowPMForm(false);
      setSuccessMsg(editingPM ? 'Método de pago actualizado ✓' : 'Método de pago creado ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAll();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar método de pago.');
    } finally {
      setSavingPM(false);
    }
  };

  const deletePaymentMethod = async (id: number) => {
    if (!confirm('¿Eliminar este método de pago?')) return;
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/config/payment-methods/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      setSuccessMsg('Método de pago eliminado ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAll();
    } catch (e) {
      console.error(e);
      setErrorMsg('Error al eliminar el método de pago.');
    }
  };

  const handleHourChange = (day: string, field: 'open' | 'close' | 'is_active', value: any) => {
    setBusinessHours((prev: any) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { open: '08:00', close: '20:00', is_active: true }),
        [field]: value,
      },
    }));
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'empresa', label: 'Mi Empresa', icon: Store },
    { id: 'horario', label: 'Horario de Atención', icon: Clock },
    { id: 'entrega', label: 'Entrega', icon: Truck },
    { id: 'pago', label: 'Métodos de Pago', icon: CreditCard },
    { id: 'recibos', label: 'Comprobantes', icon: Receipt },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm mt-0.5">Personaliza tu empresa, horarios y pagos de ChatYa</p>
        </div>
        <button onClick={fetchAll} className="btn-outline text-sm px-3 py-2">
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-violet-700 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Empresa */}
      {activeTab === 'empresa' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Información General de la Empresa</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo_url.startsWith('http') ? company.logo_url : `${API}${company.logo_url}`} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-7 h-7 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <label className="input-label font-bold text-gray-900">Logo de la Empresa (URL de Imagen)</label>
                <input
                  type="text"
                  value={company.logo_url || ''}
                  onChange={e => setCompany((c: any) => ({ ...c, logo_url: e.target.value }))}
                  className="input bg-white"
                  placeholder="https://ejemplo.com/logo.png o /uploads/logo.png"
                />
                <p className="text-[11px] text-gray-400 mt-1">Este logo aparecerá en la cabecera de la tienda para todos tus clientes.</p>
              </div>
            </div>

            <div>
              <label className="input-label">Nombre del negocio</label>
              <input
                value={company.name || ''}
                onChange={e => setCompany((c: any) => ({ ...c, name: e.target.value }))}
                className="input"
                placeholder="ej. MusicSap, Mi Tienda Comercial"
              />
            </div>
            <div>
              <label className="input-label">RUC de la Empresa (11 dígitos)</label>
              <input
                type="text"
                maxLength={11}
                value={company.ruc || ''}
                onChange={e => setCompany((c: any) => ({ ...c, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                className="input"
                placeholder="ej. 20123456789"
              />
            </div>
            <div>
              <label className="input-label">WhatsApp (con código de país sin +)</label>
              <input
                value={company.phone_whatsapp || ''}
                onChange={e => setCompany((c: any) => ({ ...c, phone_whatsapp: e.target.value.replace(/\D/g, '') }))}
                className="input"
                placeholder="51999999999"
              />
            </div>
            <div>
              <label className="input-label">Ciudad</label>
              <input
                value={company.city || ''}
                onChange={e => setCompany((c: any) => ({ ...c, city: e.target.value }))}
                className="input"
                placeholder="Lima"
              />
            </div>
            <div>
              <label className="input-label">País</label>
              <input
                value={company.country || ''}
                onChange={e => setCompany((c: any) => ({ ...c, country: e.target.value }))}
                className="input"
                placeholder="Perú"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="input-label">Dirección comercial</label>
              <input
                value={company.address || ''}
                onChange={e => setCompany((c: any) => ({ ...c, address: e.target.value }))}
                className="input"
                placeholder="Av. Principal 123"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="input-label">Mensaje de bienvenida / Descripción para clientes</label>
              <textarea
                value={config.store_description || ''}
                onChange={e => setConfig((c: any) => ({ ...c, store_description: e.target.value }))}
                className="input resize-none"
                rows={3}
                placeholder="¡Hola! Bienvenido a nuestra tienda online. Haz tu pedido por WhatsApp..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Horario de Atención */}
      {activeTab === 'horario' && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-600" /> Horarios de Atención Semanal
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Configura los días y horas en que tu tienda recibe pedidos. Tus clientes verán el indicador "Abierto" o "Cerrado".
            </p>
          </div>

          <div className="space-y-3">
            {DAYS_MAP.map(day => {
              const h = businessHours[day.key] || { open: '08:00', close: '20:00', is_active: true };
              return (
                <div key={day.key} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl flex-wrap gap-3">
                  <div className="flex items-center gap-3 min-w-36">
                    <input
                      type="checkbox"
                      checked={h.is_active}
                      onChange={e => handleHourChange(day.key, 'is_active', e.target.checked)}
                      className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                    />
                    <span className={`font-bold text-sm ${h.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {day.label}
                    </span>
                  </div>

                  {h.is_active ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">Apertura:</span>
                      <input
                        type="time"
                        value={h.open}
                        onChange={e => handleHourChange(day.key, 'open', e.target.value)}
                        className="input text-xs py-1 px-2.5 w-auto"
                      />
                      <span className="text-xs text-gray-400 font-medium">Cierre:</span>
                      <input
                        type="time"
                        value={h.close}
                        onChange={e => handleHourChange(day.key, 'close', e.target.value)}
                        className="input text-xs py-1 px-2.5 w-auto"
                      />
                    </div>
                  ) : (
                    <span className="badge badge-gray text-xs font-semibold">Cerrado todo el día</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Entrega */}
      {activeTab === 'entrega' && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Opciones & Modalidad de Entrega</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configura si realizas envíos a domicilio, montos por distrito o evaluación por WhatsApp</p>
          </div>

          {/* Methods checkboxes */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { key: 'delivery_enabled', label: 'Delivery a domicilio', desc: 'Permite solicitar envío a dirección' },
              { key: 'pickup_enabled', label: 'Recojo en tienda', desc: 'El cliente recoge en local' },
              { key: 'dine_in_enabled', label: 'Consumo en el local', desc: 'Atención presencial' },
            ].map(opt => (
              <label key={opt.key} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 border border-gray-100">
                <input
                  type="checkbox"
                  checked={config[opt.key] || false}
                  onChange={e => setConfig((c: any) => ({ ...c, [opt.key]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-800 mt-0.5"
                />
                <div>
                  <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-400">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Time visibility */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.show_estimated_time || false}
                onChange={e => setConfig((c: any) => ({ ...c, show_estimated_time: e.target.checked }))}
                className="w-4 h-4 rounded accent-slate-800"
              />
              <div>
                <span className="text-sm font-bold text-gray-900">Mostrar tiempo estimado de entrega (ej. ~30 min)</span>
                <p className="text-xs text-gray-500">Si está desmarcado, no se mostrará ningún tiempo de llegada a los clientes.</p>
              </div>
            </label>

            {config.show_estimated_time && (
              <div className="mt-3 max-w-xs">
                <label className="input-label">Tiempo estimado (minutos)</label>
                <input
                  type="number"
                  min="0"
                  value={config.estimated_delivery_minutes || 30}
                  onChange={e => setConfig((c: any) => ({ ...c, estimated_delivery_minutes: Number(e.target.value) }))}
                  className="input bg-white"
                />
              </div>
            )}
          </div>

          {/* Delivery Mode Selector */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Modalidad del Costo de Delivery</h3>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { id: 'fixed', title: 'Monto Fijo Único', desc: 'Se cobra un único monto a todas las entregas' },
                { id: 'coordinate', title: 'A Coordinar / Evaluar', desc: 'No cobra automáticamente; se acuerda por WhatsApp' },
                { id: 'district', title: 'Por Distrito de Cobertura', desc: 'Cobra según el distrito seleccionado por el cliente' },
              ].map(m => (
                <div
                  key={m.id}
                  onClick={() => setConfig((c: any) => ({ ...c, delivery_mode: m.id }))}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    (config.delivery_mode || 'fixed') === m.id
                      ? 'border-slate-800 bg-slate-50 shadow-sm'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-900">{m.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Mode: Fixed */}
            {(config.delivery_mode || 'fixed') === 'fixed' && (
              <div className="grid sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="input-label">Costo de delivery fijo (S/)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={config.delivery_cost || 0}
                    onChange={e => setConfig((c: any) => ({ ...c, delivery_cost: Number(e.target.value) }))}
                    className="input bg-white"
                  />
                </div>
                <div>
                  <label className="input-label">Delivery gratis desde (S/)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.free_delivery_from || 0}
                    onChange={e => setConfig((c: any) => ({ ...c, free_delivery_from: Number(e.target.value) }))}
                    className="input bg-white"
                    placeholder="0 (sin envío gratis)"
                  />
                </div>
              </div>
            )}

            {/* Mode: Coordinate */}
            {config.delivery_mode === 'coordinate' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                💡 En la tienda se mostrará: <strong>"Delivery: Se coordinará y evaluará por WhatsApp"</strong>. El monto no se sumará al subtotal del carrito.
              </div>
            )}

            {/* Always visible: District Coverage Manager */}
            <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border-2 border-slate-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-800" /> Distritos de Cobertura y Tarifas
                  </h4>
                  <p className="text-xs text-gray-500">Agrega todos los distritos donde realizas entregas con su tarifa individual</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Nombre del distrito (ej. Miraflores, San Isidro, Surco, Los Olivos):');
                    if (!name || !name.trim()) return;
                    const costStr = prompt('Costo de envío para ' + name.trim() + ' (S/):', '7.00');
                    const cost = parseFloat(costStr || '0') || 0;
                    const current = Array.isArray(config.covered_districts) ? config.covered_districts : [];
                    setConfig((c: any) => ({
                      ...c,
                      delivery_mode: 'district',
                      covered_districts: [...current, { name: name.trim(), cost }],
                    }));
                  }}
                  className="btn-dark text-xs px-4 py-2 font-bold flex items-center gap-1"
                >
                  + Agregar Distrito de Cobertura
                </button>
              </div>

              {(!config.covered_districts || config.covered_districts.length === 0) ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  <p className="text-xs text-gray-500 font-bold mb-1">Aún no has registrado distritos de cobertura</p>
                  <p className="text-[11px] text-gray-400">Haz clic en "+ Agregar Distrito de Cobertura" para registrar tus distritos y precios de envío.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
                  {(config.covered_districts || []).map((d: any, idx: number) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs shadow-sm">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {d.name}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">S/ {Number(d.cost).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (config.covered_districts || []).filter((_: any, i: number) => i !== idx);
                            setConfig((c: any) => ({ ...c, covered_districts: updated }));
                          }}
                          className="text-red-500 hover:text-red-700 font-bold text-base px-1"
                          title="Eliminar distrito"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Métodos de Pago */}
      {activeTab === 'pago' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">Métodos de Pago Configurados</h2>
            <button
              onClick={openCreatePM}
              className="btn-primary text-sm px-4 py-2 font-bold"
            >
              <Plus className="w-4 h-4" /> Agregar Método de Pago
            </button>
          </div>

          {/* Form Modal/Card for Create or Edit Payment Method */}
          {showPMForm && (
            <form onSubmit={savePaymentMethod} className="card p-6 border-2 border-violet-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900">
                  {editingPM ? `Editando: ${editingPM.name}` : 'Nuevo Método de Pago'}
                </h3>
                <button type="button" onClick={() => setShowPMForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nombre del método de pago *</label>
                  <input
                    required
                    value={pmForm.name}
                    onChange={e => setPmForm(p => ({ ...p, name: e.target.value }))}
                    className="input"
                    placeholder="ej. Yape, Plin, BCP, Efectivo"
                  />
                </div>
                <div>
                  <label className="input-label">Tipo de pago</label>
                  <select
                    value={pmForm.type}
                    onChange={e => setPmForm(p => ({ ...p, type: e.target.value }))}
                    className="input"
                  >
                    <option value="transfer">Transferencia / Yape / Plin</option>
                    <option value="cash">Efectivo contra entrega</option>
                    <option value="partial">50% Adelantado</option>
                    <option value="card">Tarjeta de Crédito / Débito</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="input-label">Instrucciones para el cliente (cuentas o números)</label>
                  <input
                    value={pmForm.instructions}
                    onChange={e => setPmForm(p => ({ ...p, instructions: e.target.value }))}
                    className="input"
                    placeholder="ej. Número Yape: 999-999-999 / Cta BCP: 191-12345678-0-11"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pmForm.is_active}
                      onChange={e => setPmForm(p => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded accent-violet-600"
                    />
                    Activo y disponible para clientes
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPMForm(false)}
                  className="btn-outline text-sm px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPM}
                  className="btn-dark text-sm px-5 py-2 font-bold"
                >
                  {savingPM ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPM ? 'Guardar Cambios' : 'Crear Método de Pago')}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {paymentMethods.map((pm: any) => (
              <div key={pm.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    {pm.name}
                    <span className={`badge ${pm.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {pm.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{pm.instructions || pm.type}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditPM(pm)}
                    className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
                    title="Editar método de pago"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePaymentMethod(pm.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Eliminar método de pago"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Comprobantes */}
      {activeTab === 'recibos' && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Comprobantes de Pago e IGV (18%)</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configura qué comprobantes pueden solicitar tus clientes y si deseas aplicar el 18% de IGV en los pedidos.</p>
          </div>

          {/* IGV 18% Checkbox */}
          <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.tax_enabled || false}
                onChange={e => setConfig((c: any) => ({ ...c, tax_enabled: e.target.checked }))}
                className="w-5 h-5 rounded accent-slate-800 mt-0.5"
              />
              <div>
                <div className="text-sm font-bold text-gray-900">Aplicar 18% de IGV a los pedidos</div>
                <div className="text-xs text-gray-500 mt-0.5">Al marcar esta casilla, la tienda desglosará y agregará automáticamente el 18% de IGV al subtotal en la confirmación del pedido.</div>
              </div>
            </label>
          </div>

          {/* Receipt Types */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Comprobantes Disponibles para el Cliente</h3>
            {[
              { key: 'receipt_none', label: 'Sin comprobante / Nota de Venta', desc: 'No exige ningún documento tributario' },
              { key: 'receipt_boleta', label: 'Boleta de Venta', desc: 'Permite al cliente solicitar boleta ingresando su DNI' },
              { key: 'receipt_factura', label: 'Factura Comercial', desc: 'Exige obligatoriamente RUC de 11 dígitos y Razón Social de la empresa' },
            ].map(opt => (
              <label key={opt.key} className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 border border-gray-100">
                <input
                  type="checkbox"
                  checked={config[opt.key] || false}
                  onChange={e => setConfig((c: any) => ({ ...c, [opt.key]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-800 mt-0.5"
                />
                <div>
                  <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Save Button (for empresa, horario, entrega, recibos tabs) */}
      {activeTab !== 'pago' && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={saveCompany}
            disabled={saving}
            className="btn-dark px-6 py-3 text-sm font-bold flex items-center gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar cambios</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
