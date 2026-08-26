'use client';
import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle, Loader2, MapPin, Store, CreditCard, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STEPS = [
  { key: 'pendiente', label: 'Pedido Recibido', icon: Clock, desc: 'Tu pedido ha sido registrado correctamente.' },
  { key: 'recibido', label: 'Confirmado por la Tienda', icon: Package, desc: 'La tienda ha verificado tu pedido.' },
  { key: 'preparando', label: 'En Preparación', icon: Package, desc: 'Estamos empacando tus productos.' },
  { key: 'en camino', label: 'En Camino', icon: Truck, desc: 'Tu pedido está en ruta hacia tu dirección.' },
  { key: 'entregado', label: 'Entregado', icon: CheckCircle, desc: '¡Pedido entregado con éxito!' },
];

export default function OrderTracking({ params }: { params: { token: string } }) {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrackingInfo();
  }, [params.token]);

  const fetchTrackingInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/v1/tracking/${params.token}`);
      if (!res.ok) {
        throw new Error('No pudimos encontrar la información de este pedido.');
      }
      const data = await res.json();
      setOrder(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el seguimiento del pedido.');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (statusStr: string) => {
    if (!statusStr) return 0;
    const st = statusStr.toLowerCase();
    if (st.includes('anulado') || st.includes('cancel')) return -1;
    if (st.includes('entregado') || st.includes('pagado')) return 4;
    if (st.includes('camino')) return 3;
    if (st.includes('preparando')) return 2;
    if (st.includes('recibido')) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-slate-800 mb-3" />
        <p className="text-sm font-bold text-slate-700">Cargando estado del pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Seguimiento no disponible</h1>
          <p className="text-xs text-gray-500">{error || 'El código de seguimiento no es válido.'}</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(order.status);
  const isCancelled = currentStepIndex === -1;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl p-6 shadow-sm my-6 space-y-6">

        {/* Company Header */}
        <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado de tu Pedido</span>
            <h1 className="text-2xl font-black text-slate-900 font-mono mt-0.5">{order.order_code}</h1>
          </div>
          <span className="badge bg-slate-100 text-slate-900 font-bold px-3 py-1 text-xs border border-gray-200">
            {order.company_name || 'MusicSap'}
          </span>
        </div>

        {/* Status Stepper Timeline */}
        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-2">
            <span className="text-2xl">🚫</span>
            <h2 className="font-bold text-red-800 text-base">Pedido Anulado</h2>
            <p className="text-xs text-red-600">Este pedido fue anulado por la tienda o por el cliente.</p>
          </div>
        ) : (
          <div className="relative space-y-6 pl-2">
            <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gray-200 -z-0"></div>

            {STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-4 relative z-10">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-gray-100 border border-gray-200 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-slate-200 font-bold scale-105' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="pt-1 min-w-0">
                    <h3 className={`font-bold text-sm ${isCompleted ? 'text-slate-900' : 'text-gray-400'}`}>
                      {step.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                    {isCurrent && (
                      <span className="inline-block bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full mt-1.5">
                        ● Estado Actual
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Real Items Summary */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200 space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
            Resumen del Pedido
          </h3>

          <div className="space-y-2 text-xs">
            {(order.items || []).map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-1">
                <span className="text-slate-800 font-semibold">
                  <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-gray-200 mr-2">
                    {item.quantity}×
                  </span>
                  {item.product_name}
                </span>
                <span className="font-bold text-slate-900">
                  S/ {Number(item.total_price || (item.unit_price * item.quantity)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-800">S/ {Number(order.subtotal || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Costo de envío</span>
              <span className="font-medium text-slate-800">
                {Number(order.delivery_cost || 0) > 0 ? `S/ ${Number(order.delivery_cost).toFixed(2)}` : 'S/ 0.00'}
              </span>
            </div>

            <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-gray-200">
              <span>Total a Pagar</span>
              <span className="text-slate-900">S/ {Number(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">👤 Cliente:</span>
            <span>{order.customer_name}</span>
          </div>

          {order.delivery_address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-800 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Dirección de Entrega:</span>
                <p className="text-slate-700">{order.delivery_address} {order.delivery_district ? `(${order.delivery_district})` : ''}</p>
                {order.delivery_reference && <p className="text-gray-400">Ref: {order.delivery_reference}</p>}
              </div>
            </div>
          )}

          {order.payment_method && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-gray-500">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Forma de pago: <strong className="text-slate-900">{order.payment_method}</strong></span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
