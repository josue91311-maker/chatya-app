'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import {
  ChevronLeft, Trash2, Plus, Minus, ArrowRight,
  ShoppingBag, Eye, AlertTriangle, RefreshCw, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CartPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const previewParam = isPreview ? '?preview=true' : '';

  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string>('');
  const [stockWarnings, setStockWarnings] = useState<Record<number, string>>({});

  useEffect(() => {
    setMounted(true);

    // Auto-sync real database prices and stock availability
    if (items.length > 0) {
      fetch(`${API}/api/v1/store/${params.slug}/products`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.data && Array.isArray(data.data)) {
            const prods = data.data;
            let pricesChanged = false;
            const warnings: Record<number, string> = {};

            items.forEach((item) => {
              const serverProd = prods.find((p: any) => p.id === item.product.id);
              if (serverProd) {
                // Check if price changed
                if (Math.abs(Number(serverProd.price) - Number(item.product.price)) > 0.001) {
                  item.product.price = Number(serverProd.price);
                  pricesChanged = true;
                }
                // Check stock
                if (serverProd.stock <= 0) {
                  warnings[item.product.id] = 'Sin stock disponible actualmente';
                } else if (serverProd.stock < item.quantity) {
                  warnings[item.product.id] = `Solo quedan ${serverProd.stock} unidades en stock`;
                }
              } else {
                warnings[item.product.id] = 'Producto ya no disponible en la tienda';
              }
            });

            if (pricesChanged) {
              setSyncNotice('💡 Se actualizaron los precios de algunos productos al valor actual de la tienda.');
            }
            setStockWarnings(warnings);
          }
        })
        .catch(() => {});
    }
  }, [params.slug, items]);

  const subtotal = getSubtotal();
  const totalItemsCount = items.reduce((c, i) => c + i.quantity, 0);
  const hasBlockingStockErrors = Object.values(stockWarnings).some((w) =>
    w.includes('Sin stock') || w.includes('ya no disponible')
  );

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 text-3xl">
          🛒
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tu carrito está vacío</h1>
        <p className="text-slate-500 text-xs mb-6 max-w-xs leading-relaxed">
          Explora nuestro catálogo y agrega los productos o presentaciones que desees comprar.
        </p>
        <Link
          href={`/${params.slug}${previewParam}`}
          className="btn-dark px-6 py-3.5 rounded-2xl text-xs font-bold shadow-md"
        >
          Ver Productos de la Tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-36 font-sans">
      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">Modo vista previa activo</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link
          href={`/${params.slug}${previewParam}`}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-xs font-bold">Seguir comprando</span>
        </Link>
        <button
          onClick={clearCart}
          className="text-xs text-red-500 hover:text-red-700 font-bold"
        >
          Vaciar carrito
        </button>
      </header>

      {/* Items list */}
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        {/* Sync notification if prices updated */}
        {syncNotice && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold p-3.5 rounded-2xl shadow-sm flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="font-black text-slate-900 text-lg">Mi Carrito de Compras</h1>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
            {totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        <AnimatePresence>
          {items.map((item) => {
            const warning = stockWarnings[item.product.id];

            return (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                className={`bg-white rounded-2xl border p-3.5 flex flex-col gap-2 shadow-sm transition-all ${
                  warning ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'
                }`}
              >
                <div className="flex gap-3 items-center">
                  {/* Image */}
                  <div className="w-16 h-16 bg-slate-50 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-100">
                    {item.product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          item.product.image_url.startsWith('http')
                            ? item.product.image_url
                            : `${API}${item.product.image_url}`
                        }
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl opacity-40">🛍️</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-xs line-clamp-2 mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-slate-900 font-black text-sm">
                      S/ {(item.product.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      S/ {Number(item.product.price).toFixed(2)} c/u
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-0.5">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, Math.max(1, item.quantity - 1))
                        }
                        className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all"
                      >
                        <Minus className="w-2.5 h-2.5 text-slate-700" />
                      </button>
                      <span className="text-xs font-black text-slate-900 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center hover:bg-slate-800 active:scale-90 transition-all"
                      >
                        <Plus className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stock warning message if any */}
                {warning && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Order Summary */}
        <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Resumen del Carrito</span>
            <span>{totalItemsCount} artículos</span>
          </div>

          <div className="border-t border-gray-100 pt-3 flex justify-between items-center font-black text-lg text-slate-900">
            <span>Total en Productos</span>
            <span className="text-emerald-700">S/ {subtotal.toFixed(2)}</span>
          </div>

          <p className="text-[11px] text-slate-400 text-center font-medium">
            💡 El método de entrega (Delivery o Recojo) y dirección se eligen en el siguiente paso.
          </p>
        </div>

        {/* Add more link */}
        <Link
          href={`/${params.slug}${previewParam}`}
          className="block text-center text-xs text-slate-700 font-bold py-2 hover:underline"
        >
          + Agregar más productos
        </Link>
      </div>

      {/* Bottom CTA */}
      <div className="bottom-bar bg-white border-t border-gray-100 px-4 py-3">
        <button
          onClick={() => router.push(`/${params.slug}/checkout${previewParam}`)}
          disabled={hasBlockingStockErrors}
          className="btn-dark w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{hasBlockingStockErrors ? 'Ajusta los productos sin stock' : 'Continuar con el Pedido'}</span>
          <div className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">
            S/ {subtotal.toFixed(2)}
          </div>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
