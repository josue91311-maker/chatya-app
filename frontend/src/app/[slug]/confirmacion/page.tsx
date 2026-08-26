'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Eye, Copy, Check, ExternalLink, MessageSquare } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ConfirmationPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const orderCode = searchParams.get('order_code') || 'PED-000001';
  const trackingToken = searchParams.get('tracking') || '';
  const waUrlParam = searchParams.get('wa_url') || '';
  const customerName = searchParams.get('name') || 'Cliente';

  const [copied, setCopied] = useState(false);
  const [waOpened, setWaOpened] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);

  // Load store info for the phone number
  useEffect(() => {
    fetch(`${API}/api/v1/store/${params.slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setStoreInfo(d.data); })
      .catch(() => {});
  }, [params.slug]);

  // Auto-open WhatsApp after 1s (only in real mode, not preview)
  useEffect(() => {
    if (!isPreview && waUrlParam) {
      const timer = setTimeout(() => {
        window.location.href = decodeURIComponent(waUrlParam);
        setWaOpened(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isPreview, waUrlParam]);

  const decodedWaUrl = waUrlParam ? decodeURIComponent(waUrlParam) : '';

  const handleWhatsApp = () => {
    if (decodedWaUrl) {
      window.location.href = decodedWaUrl;
      setWaOpened(true);
    } else if (storeInfo?.phone_whatsapp) {
      window.location.href = `https://wa.me/${storeInfo.phone_whatsapp}`;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">Modo vista previa — Pedido de prueba</p>
        </div>
      )}

      <div className="px-4 py-8 max-w-md mx-auto space-y-5">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
          className="flex flex-col items-center text-center pt-6"
        >
          <div className="relative mb-5">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-1 -right-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center"
            >
              <Package className="w-4 h-4 text-white" />
            </motion.div>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-1">
            {customerName === 'CLIENTES VARIOS' ? '¡Pedido listo!' : `¡Listo, ${customerName}!`}
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Tu pedido fue registrado y está <span className="font-semibold text-amber-600">Pendiente</span>
          </p>

          {/* Order code */}
          <button onClick={handleCopy}
            className="bg-white border border-gray-200 px-5 py-2.5 rounded-xl flex items-center gap-3 hover:border-violet-300 transition-all shadow-sm">
            <span className="font-mono font-bold text-violet-700 text-lg tracking-wider">{orderCode}</span>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
          <p className="text-xs text-gray-400 mt-2">Toca para copiar tu código de pedido</p>
        </motion.div>

        {/* Status explanation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Estado del pedido</h2>
          <div className="space-y-3">
            {[
              { status: '🕐 Pendiente', desc: 'El vendedor recibió tu pedido', done: true, current: true },
              { status: '🚚 En camino', desc: 'Tu pedido está siendo entregado', done: false, current: false },
              { status: '✅ Entregado', desc: 'Pedido completado', done: false, current: false },
            ].map((s, i) => (
              <div key={i} className={`flex items-start gap-3 p-2 rounded-lg ${s.current ? 'bg-amber-50' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.done ? 'bg-amber-400' : 'bg-gray-200'}`} />
                <div>
                  <p className={`text-sm font-medium ${s.current ? 'text-amber-700' : 'text-gray-400'}`}>{s.status}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* WhatsApp Button - MAIN CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="space-y-3">

          {/* WhatsApp CTA */}
          <button onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1da851] active:bg-[#128C7E] text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-green-200">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {waOpened ? '✓ WhatsApp abierto' : 'Enviar pedido por WhatsApp'}
          </button>

          {/* Info */}
          {!isPreview && (
            <p className="text-xs text-gray-400 text-center">
              Se abrirá WhatsApp con el resumen de tu pedido para que lo envíes al vendedor.
            </p>
          )}
          {isPreview && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              <strong>En modo real:</strong> Al confirmar el pedido, WhatsApp se abre automáticamente con el mensaje listo para enviar.
            </div>
          )}

          {/* Tracking link */}
          {trackingToken && (
            <Link href={`/seguimiento/${trackingToken}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-violet-300 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">Seguir mi pedido</p>
                <p className="text-xs text-gray-400">Ver estado en tiempo real</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </Link>
          )}

          <Link href={`/${params.slug}${isPreview ? '?preview=true' : ''}`}
            className="block text-center text-sm text-gray-400 hover:text-gray-600 py-2">
            ← Seguir comprando
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
