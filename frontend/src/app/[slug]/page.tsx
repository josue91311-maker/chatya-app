'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingBag, Search, Star, Clock, MapPin, ChevronRight,
  Flame, Sparkles, Package, Eye, ArrowRight, Layers,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function StoreHomePage({ params }: { params: { slug: string } }) {
  const [store, setStore] = useState<any>({ name: 'Cargando...', currency_symbol: 'S/' });
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [addedId, setAddedId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedFactors, setSelectedFactors] = useState<Record<number, any>>({});

  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const addItem = useCart(s => s.addItem);
  const cartCount = useCart(s => s.getItemCount());
  const setCompanySlug = useCart(s => s.setCompanySlug);

  useEffect(() => {
    setMounted(true);
    setCompanySlug(params.slug);

    // Capture Phone Parameter from WhatsApp Link if passed
    const phoneParam = searchParams.get('phone') || searchParams.get('wa') || searchParams.get('tel');
    if (phoneParam) {
      const cleanPhone = phoneParam.replace(/\D/g, '');
      localStorage.setItem(`chatya_phone_${params.slug}`, cleanPhone);
      fetch(`${API}/api/v1/store/${params.slug}/customer-lookup?phone=${cleanPhone}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.exists && data.full_name) {
            localStorage.setItem(`chatya_name_${params.slug}`, data.full_name);
          }
        })
        .catch(() => {});
    }

    // Fetch Store Info
    fetch(`${API}/api/v1/store/${params.slug}`).then(r => r.json()).then(d => {
      if (d.data) setStore(d.data);
    });

    // Fetch Categories & Products in parallel
    Promise.all([
      fetch(`${API}/api/v1/store/${params.slug}/categories`).then(r => r.json()),
      fetch(`${API}/api/v1/store/${params.slug}/products`).then(r => r.json())
    ]).then(([catsData, prodsData]) => {
      if (catsData?.data && Array.isArray(catsData.data) && catsData.data.length > 0) {
        setCategories([{ id: 0, name: 'Todos', slug: 'todos' }, ...catsData.data]);
      }
      if (prodsData?.data && Array.isArray(prodsData.data)) {
        setProducts(prodsData.data);
      }
    });
  }, [params.slug, setCompanySlug]);

  const handleAdd = (p: any) => {
    const customFactor = selectedFactors[p.id];
    const itemToAdd = customFactor
      ? {
          ...p,
          name: customFactor.is_base ? p.name : `${p.name} (${customFactor.unit_name})`,
          price: customFactor.price,
          unit_name: customFactor.unit_name,
        }
      : p;

    addItem(itemToAdd);
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const selectFactorForProduct = (productId: number, factor: any) => {
    setSelectedFactors(prev => ({
      ...prev,
      [productId]: factor,
    }));
  };

  const featured = products.filter(p => p.is_featured);

  const filteredProducts = products.filter(p => {
    const catMatch = activeCategory === 0 || p.category_id === activeCategory;
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const getStoreStatus = () => {
    const hours = store.business_hours;
    if (!hours || typeof hours !== 'object') {
      return { isOpen: true, text: 'Abierto' };
    }
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const dayKey = days[now.getDay()];
    const today = hours[dayKey];
    if (!today || !today.is_active) {
      return { isOpen: false, text: 'Cerrado hoy' };
    }
    const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = (today.open || '08:00').split(':').map(Number);
    const [ch, cm] = (today.close || '20:00').split(':').map(Number);
    const op = oh * 60 + om;
    const cl = ch * 60 + cm;
    if (cur >= op && cur <= cl) {
      return { isOpen: true, text: `Abierto (Cierra ${today.close})` };
    }
    return { isOpen: false, text: `Cerrado (Abre ${today.open})` };
  };

  const status = getStoreStatus();

  const imgUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API}${url}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Modo vista previa — Los pedidos no se enviarán por WhatsApp real.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Company Logo */}
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
              {imgUrl(store.logo_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl(store.logo_url)!} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-sm">{store.name ? store.name.substring(0, 2).toUpperCase() : 'MS'}</span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm truncate">{store.name}</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`text-xs font-semibold ${status.isOpen ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>

          {/* Cart Icon in Header */}
          {mounted && (
            <Link
              href={`/${params.slug}/carrito${isPreview ? '?preview=true' : ''}`}
              className="relative p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-800 transition-colors flex-shrink-0"
              aria-label="Ver Carrito"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar productos, marcas, sabores..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-slate-300 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-6 max-w-4xl mx-auto">
        {/* Welcome Message / Store Description */}
        {store.welcome_message && !search && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <span className="bg-white/10 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2 border border-white/10">
                ✨ Catálogo Oficial
              </span>
              <h2 className="font-black text-lg leading-tight mb-1">{store.welcome_message}</h2>
              <p className="text-xs text-slate-300">Haz tu pedido fácil y recíbelo por WhatsApp en minutos.</p>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === c.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Featured Products */}
        {featured.length > 0 && !search && activeCategory === 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h2 className="font-black text-slate-900 text-sm">Más Populares & Destacados</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {featured.map(p => {
                const availableFactors = (p.unit_factors || []).filter((uf: any) => uf.price > 0);
                const showFactorSelect = p.allow_unit_selection !== false && availableFactors.length > 1;
                const activeFactor = selectedFactors[p.id] || availableFactors.find((f: any) => f.is_base) || availableFactors[0];
                const displayPrice = activeFactor ? activeFactor.price : p.price;
                const displayUnit = activeFactor ? activeFactor.unit_name : (p.unit_name || 'Unidad');

                return (
                  <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between p-3 card-hover">
                    <div>
                      <Link href={`/${params.slug}/productos/${p.slug}${isPreview ? '?preview=true' : ''}`}>
                        <div className="h-32 bg-gray-50 rounded-xl overflow-hidden mb-2 flex items-center justify-center border border-gray-100 relative">
                          {imgUrl(p.image_url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl(p.image_url)!} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-8 h-8 text-gray-300" />
                          )}
                          <span className="absolute top-2 right-2 bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" /> TOP
                          </span>
                        </div>
                      </Link>
                      {p.brand_name && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.brand_name}</p>}
                      <h3 className="font-bold text-slate-900 text-xs line-clamp-2 mb-1">{p.name}</h3>

                      {/* Presentation selector if customer selection is enabled */}
                      {showFactorSelect ? (
                        <select
                          value={activeFactor?.id || ''}
                          onChange={(e) => {
                            const found = availableFactors.find((f: any) => String(f.id) === e.target.value);
                            if (found) selectFactorForProduct(p.id, found);
                          }}
                          className="w-full text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 mb-2 text-slate-800 outline-none"
                        >
                          {availableFactors.map((uf: any) => (
                            <option key={uf.id} value={uf.id}>
                              {uf.unit_name} · S/ {Number(uf.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{displayUnit}</p>
                      )}
                    </div>

                    <div>
                      <div className="font-black text-slate-900 text-sm mb-2">
                        {store.currency_symbol} {Number(displayPrice).toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleAdd(p)}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                          addedId === p.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {addedId === p.id ? '✓ Agregado' : '+ Agregar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* All Products Grid */}
        <section className="space-y-3">
          <h2 className="font-bold text-slate-900 text-base">
            {activeCategory === 0 ? 'Todos los Productos' : categories.find(c => c.id === activeCategory)?.name}
          </h2>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">No hay productos en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(p => {
                const availableFactors = (p.unit_factors || []).filter((uf: any) => uf.price > 0);
                const showFactorSelect = p.allow_unit_selection !== false && availableFactors.length > 1;
                const activeFactor = selectedFactors[p.id] || availableFactors.find((f: any) => f.is_base) || availableFactors[0];
                const displayPrice = activeFactor ? activeFactor.price : p.price;
                const displayUnit = activeFactor ? activeFactor.unit_name : (p.unit_name || 'Unidad');

                return (
                  <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between p-3 card-hover">
                    <div>
                      <Link href={`/${params.slug}/productos/${p.slug}${isPreview ? '?preview=true' : ''}`}>
                        <div className="h-32 bg-gray-50 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center border border-gray-100">
                          {imgUrl(p.image_url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl(p.image_url)!} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-8 h-8 text-gray-300" />
                          )}
                        </div>
                      </Link>
                      {p.brand_name && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.brand_name}</p>}
                      <h3 className="font-bold text-slate-900 text-xs line-clamp-2 mb-1">{p.name}</h3>

                      {/* Presentation selector if customer selection is enabled */}
                      {showFactorSelect ? (
                        <select
                          value={activeFactor?.id || ''}
                          onChange={(e) => {
                            const found = availableFactors.find((f: any) => String(f.id) === e.target.value);
                            if (found) selectFactorForProduct(p.id, found);
                          }}
                          className="w-full text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 mb-2 text-slate-800 outline-none"
                        >
                          {availableFactors.map((uf: any) => (
                            <option key={uf.id} value={uf.id}>
                              {uf.unit_name} · S/ {Number(uf.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{displayUnit}</p>
                      )}
                    </div>

                    <div>
                      <div className="font-black text-slate-900 text-sm mb-2">
                        {store.currency_symbol} {Number(displayPrice).toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleAdd(p)}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                          addedId === p.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {addedId === p.id ? '✓ Agregado' : '+ Agregar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Floating Cart Button */}
      {mounted && cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <Link
            href={`/${params.slug}/carrito${isPreview ? '?preview=true' : ''}`}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-between shadow-2xl border border-slate-700 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-black">
                {cartCount}
              </span>
              <span>Ver Carrito de Compras</span>
            </div>
            <span className="text-emerald-400 font-black">Ir a Pagar →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
