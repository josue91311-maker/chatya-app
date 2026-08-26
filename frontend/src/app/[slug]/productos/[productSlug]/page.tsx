'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ShoppingCart, Plus, Minus, Star, Package,
  Truck, Eye, Check, Layers,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const MOCK_PRODUCTS: Record<string, any> = {
  'hamburguesa-clasica': {
    id: 1, name: 'Hamburguesa Clásica', slug: 'hamburguesa-clasica',
    description: 'Carne de res premium 120g, queso cheddar, lechuga fresca, tomate y salsa especial de la casa.',
    price: 18.90, stock: 50, category_id: 1, is_featured: true,
  },
};

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string; productSlug: string };
}) {
  const [product, setProduct] = useState<any>(null);
  const [selectedFactor, setSelectedFactor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.getItemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API}/api/v1/store/${params.slug}/products/${params.productSlug}`
        );
        if (res.ok) {
          const data = await res.json();
          const p = data.data || data;
          setProduct(p);

          if (p && p.unit_factors && p.unit_factors.length > 0) {
            const base = p.unit_factors.find((f: any) => f.is_base) || p.unit_factors[0];
            setSelectedFactor(base);
          }
        } else {
          const mock = MOCK_PRODUCTS[params.productSlug];
          setProduct(mock || null);
        }
      } catch {
        const mock = MOCK_PRODUCTS[params.productSlug];
        setProduct(mock || null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.slug, params.productSlug]);

  const activePrice = selectedFactor ? selectedFactor.price : (product?.price || 0);

  const handleAdd = () => {
    if (!product) return;
    const prodToAdd = selectedFactor
      ? {
          ...product,
          name: selectedFactor.is_base ? product.name : `${product.name} (${selectedFactor.unit_name})`,
          price: selectedFactor.price,
          unit_name: selectedFactor.unit_name,
        }
      : product;

    for (let i = 0; i < quantity; i++) {
      addItem(prodToAdd);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleGoToCart = () => {
    handleAdd();
    router.push(`/${params.slug}/carrito${isPreview ? '?preview=true' : ''}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="bg-white p-4 space-y-4">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-16 h-16 text-gray-200 mb-4" />
        <h1 className="text-xl font-bold text-gray-700 mb-2">Producto no disponible</h1>
        <p className="text-gray-400 mb-6">Este producto no existe o está oculto temporalmente.</p>
        <Link
          href={`/${params.slug}${isPreview ? '?preview=true' : ''}`}
          className="btn-dark px-6 py-3"
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }

  const outOfStock = product.stock === 0;
  const discount =
    product.previous_price && product.previous_price > activePrice
      ? Math.round(((product.previous_price - activePrice) / product.previous_price) * 100)
      : 0;

  const images: string[] =
    product.images?.map((i: any) => (i.url.startsWith('http') ? i.url : `${API}${i.url}`)) ||
    (product.image_url ? [product.image_url.startsWith('http') ? product.image_url : `${API}${product.image_url}`] : []);

  const availableFactors = (product.unit_factors || []).filter((uf: any) => uf.price > 0);
  const showUnitSelector = product.allow_unit_selection !== false && availableFactors.length > 1;

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-40">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">Modo vista previa activo</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/${params.slug}${isPreview ? '?preview=true' : ''}`}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <Link
          href={`/${params.slug}/carrito${isPreview ? '?preview=true' : ''}`}
          className="relative p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-slate-800 hover:text-slate-900 transition-all"
        >
          <ShoppingCart className="w-4 h-4" />
          {mounted && cartCount > 0 && (
            <span className="cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
          )}
        </Link>
      </header>

      {/* Product Image */}
      <div className="bg-white">
        <div className="relative h-72 flex items-center justify-center overflow-hidden bg-gray-50">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-200">
              <Package className="w-20 h-20" />
              <span className="text-sm">Sin imagen</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <span className="badge badge-red">-{discount}%</span>
            )}
            {product.is_featured && (
              <span className="badge badge-violet">
                <Star className="w-3 h-3 mr-1 fill-current" />Popular
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                  activeImg === i ? 'border-slate-900' : 'border-transparent'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="px-4 pt-5 space-y-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight mb-1">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                S/ {Number(activePrice).toFixed(2)}
              </span>
              {selectedFactor && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                  por {selectedFactor.unit_name}
                </span>
              )}
              {product.previous_price && (
                <span className="text-sm text-gray-300 line-through mt-0.5">
                  S/ {Number(product.previous_price).toFixed(2)}
                </span>
              )}
            </div>
            {discount > 0 && (
              <span className="badge badge-red font-bold">
                Ahorra S/ {(product.previous_price - activePrice).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Unit / Presentation Selector if enabled */}
        {showUnitSelector && (
          <div className="card p-4 space-y-2.5 border-2 border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-800" /> Elige tu Presentación:
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">Precios según cantidad</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableFactors.map((uf: any) => {
                const isSelected = selectedFactor?.id === uf.id;
                return (
                  <button
                    key={uf.id}
                    type="button"
                    onClick={() => setSelectedFactor(uf)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                        : 'bg-white text-slate-800 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{uf.unit_name}</span>
                      {uf.is_base && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          Base
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-black mt-1 ${
                        isSelected ? 'text-emerald-400' : 'text-slate-900'
                      }`}
                    >
                      S/ {Number(uf.price).toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="card p-4">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Descripción</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Stock & Delivery info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${outOfStock ? 'bg-red-400' : 'bg-green-400'}`} />
            <div>
              <p className="text-xs text-gray-400">Disponibilidad</p>
              <p className="text-sm font-bold text-gray-900">
                {outOfStock ? 'Agotado' : `${product.stock} ${product.unit_name || 'unid.'}`}
              </p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-700 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Entrega</p>
              <p className="text-sm font-bold text-gray-900">Inmediata</p>
            </div>
          </div>
        </div>

        {/* Quantity Selector */}
        {!outOfStock && (
          <div className="card p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Cantidad</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-lg font-black text-gray-900 w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(q + 1, product.max_per_order || 99))}
                className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Consultation Button by WhatsApp */}
        <div className="pt-2">
          <a
            href={`https://wa.me/${(product.company_phone || '51999999999').replace(/\D/g, '')}?text=${encodeURIComponent(
              `Hola! Quisiera consultar sobre este producto:\n\n📌 *${product.name}*\n💰 Precio: S/ ${Number(activePrice).toFixed(2)} (${selectedFactor?.unit_name || product.unit_name})\n🔢 Código/SKU: ${product.sku || 'PROD-' + product.id}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <span className="text-base">💬</span>
            <span>Consultar producto por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bottom-bar bg-white border-t border-gray-100 px-4 py-3">
        {outOfStock ? (
          <div className="text-center py-2 text-gray-400 font-medium">
            Producto agotado — vuelve pronto
          </div>
        ) : (
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAdd}
              className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${
                added
                  ? 'bg-emerald-600 text-white'
                  : 'border-2 border-slate-900 text-slate-900 hover:bg-gray-50'
              }`}
            >
              {added ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Agregado
                </span>
              ) : (
                `Agregar (S/ ${(activePrice * quantity).toFixed(2)})`
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleGoToCart}
              className="flex-1 btn-dark py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Ir al carrito
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
