'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Phone, ChevronDown, Eye } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

interface WhatsAppPreviewProps {
  storePhone?: string;
  storeName?: string;
  currencySymbol?: string;
  deliveryCost?: number;
}

function generateOrderCode() {
  const n = Math.floor(Math.random() * 999) + 1;
  return `PED-${String(n).padStart(6, '0')}`;
}

function buildMessage(
  items: any[],
  subtotal: number,
  total: number,
  currencySymbol: string,
  deliveryCost: number,
  orderCode: string
): string {
  if (items.length === 0) return '';

  const itemLines = items
    .map(i => `  ${i.quantity}x ${i.product.name} — ${currencySymbol} ${(i.product.price * i.quantity).toFixed(2)}`)
    .join('\n');

  return `¡Hola! Quiero confirmar mi pedido 🛒

📋 *Pedido:* ${orderCode}

🛍️ *Productos:*
${itemLines}

💰 Subtotal: ${currencySymbol} ${subtotal.toFixed(2)}
🚚 Delivery: ${currencySymbol} ${deliveryCost.toFixed(2)}
💳 *Total: ${currencySymbol} ${total.toFixed(2)}*

💳 Pago: Por confirmar
🚚 Entrega: Delivery a domicilio

✅ ¡Gracias!`;
}

export default function WhatsAppPreview({
  storePhone = '51999999999',
  storeName = 'ChatYa Store',
  currencySymbol = 'S/',
  deliveryCost = 5,
}: WhatsAppPreviewProps) {
  const [open, setOpen] = useState(false);
  const [orderCode] = useState(() => generateOrderCode());
  const [now, setNow] = useState('');

  const items = useCart(s => s.items);
  const getSubtotal = useCart(s => s.getSubtotal);
  const cartCount = useCart(s => s.getItemCount());

  useEffect(() => {
    const d = new Date();
    setNow(d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
  }, [items]);

  const subtotal = getSubtotal();
  const total = subtotal + deliveryCost;
  const message = buildMessage(items, subtotal, total, currencySymbol, deliveryCost, orderCode);

  if (cartCount === 0) return null;

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-28 right-4 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-2xl shadow-xl shadow-green-200 font-semibold text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Ver mensaje</span>
            <div className="bg-white/30 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
              {cartCount}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* WhatsApp Preview Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50 md:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-4 right-4 z-50 w-[320px] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            >
              {/* WhatsApp phone chrome */}
              <div className="bg-[#ECE5DD] flex flex-col" style={{ height: '520px' }}>

                {/* WhatsApp Header */}
                <div className="bg-[#128C7E] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {storeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight">{storeName}</p>
                      <p className="text-white/70 text-xs">+{storePhone}</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)}
                    className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Chat wallpaper area */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 0h60v60H0z' fill='%23DFD3C3' opacity='.3'/%3E%3C/svg%3E")`,
                    backgroundSize: '60px 60px',
                  }}>

                  {/* System message */}
                  <div className="flex justify-center">
                    <span className="bg-[#E1F2FB] text-[#8696A0] text-[10px] px-3 py-1 rounded-full">
                      Hoy — Simulación de pedido
                    </span>
                  </div>

                  {/* Customer's message bubble */}
                  <div className="flex justify-end">
                    <div className="bg-[#D9FDD3] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm">
                      <pre className="text-[11.5px] text-[#111B21] whitespace-pre-wrap font-sans leading-relaxed">
                        {message || '...'}
                      </pre>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-[#8696A0]">{now}</span>
                        <svg width="15" height="11" viewBox="0 0 15 11" className="text-[#53BDEB]">
                          <path d="M11.071.653L4.42 7.304 1.929 4.813.258 6.484l4.162 4.163L12.742 2.324z" fill="currentColor"/>
                          <path d="M14.742.653L8.091 7.304l-1.5-1.5-1.671 1.671 3.171 3.171L16.413 2.324z" fill="currentColor"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Store reply bubble */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-[11.5px] text-[#111B21] leading-relaxed">
                        ✅ ¡Recibido! Tu pedido <span className="font-bold">{orderCode}</span> está siendo procesado.
                        Te notificaremos cuando esté en camino 🚚
                      </p>
                      <div className="flex items-center justify-end mt-1">
                        <span className="text-[10px] text-[#8696A0]">{now}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Input bar */}
                <div className="bg-[#F0F2F5] px-3 py-2 flex items-center gap-2 border-t border-[#E0E0E0]">
                  <div className="flex-1 bg-white rounded-2xl px-3 py-2">
                    <p className="text-[11px] text-[#8696A0]">Mensaje enviado automáticamente...</p>
                  </div>
                  <div className="w-8 h-8 bg-[#00A884] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
                    </svg>
                  </div>
                </div>

                {/* Preview label */}
                <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium">
                    Vista previa del mensaje real · Se graba como <strong>{orderCode}</strong>
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
