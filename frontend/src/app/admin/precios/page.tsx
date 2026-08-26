'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator, Search, Plus, Pencil, Trash2, Loader2,
  Check, AlertCircle, RefreshCw, X, Package, Sparkles, Tag,
  ShoppingCart, Truck, Layers, Star, TrendingUp, Save,
  CheckCircle2, DollarSign,
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

const COMMON_UNITS = [
  'UNIDAD',
  'DOCENA',
  'CAJA x6',
  'CAJA x12',
  'CAJA x24',
  'PACK x4',
  'PACK x6',
  'KILO (KG)',
  'GRAMO (GR)',
  'LITRO (LT)',
  'BOLSA',
  'FARDO',
  'PAQUETE',
];

export default function PricesPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Inline pricing edits state: { [factorId]: { cost_price: string, price: string, saving: boolean, saved: boolean } }
  const [inlinePrices, setInlinePrices] = useState<Record<number, { cost_price: string; price: string; saving?: boolean; saved?: boolean }>>({});

  // Unit factor modal (Add & Edit Full Factor)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingFactor, setEditingFactor] = useState<any>(null);
  const [unitName, setUnitName] = useState('CAJA x12');
  const [factor, setFactor] = useState('12');
  const [costPrice, setCostPrice] = useState('0.00');
  const [price, setPrice] = useState('0.00');
  const [isBase, setIsBase] = useState(false);
  const [forSale, setForSale] = useState(true);
  const [forPurchase, setForPurchase] = useState(true);
  const [submittingFactor, setSubmittingFactor] = useState(false);

  // Quick Price Modal state (only cost & price)
  const [quickPriceModal, setQuickPriceModal] = useState<{
    product: any;
    factor: any;
    cost_price: string;
    price: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, [categoryFilter, brandFilter]);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (brandFilter) params.set('brand_name', brandFilter);

      const res = await fetch(`${API}/api/v1/products/?${params}`, { headers });
      if (res.status === 401 || res.status === 403) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        const prods = d.data || d || [];
        setProducts(prods);

        // Initialize inline prices map
        const initialPrices: Record<number, any> = {};
        prods.forEach((p: any) => {
          (p.unit_factors || []).forEach((uf: any) => {
            if (uf.id) {
              initialPrices[uf.id] = {
                cost_price: String(uf.cost_price ?? '0.00'),
                price: String(uf.price ?? '0.00'),
              };
            }
          });
        });
        setInlinePrices(initialPrices);
      } else {
        setErrorMsg('Error al cargar catálogo de precios.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión al cargar productos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/categories/`, { headers });
      if (res.ok) {
        const d = await res.json();
        setCategories(d.data || d || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBrands = async () => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/brands/`, { headers });
      if (res.ok) {
        const d = await res.json();
        setBrands(d.data || d || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Save of Cost & Sale Price for a single factor
  const handleSaveInlinePrice = async (productId: number, factorId: number) => {
    const data = inlinePrices[factorId];
    if (!data) return;

    const costNum = parseFloat(data.cost_price) || 0.0;
    const priceNum = parseFloat(data.price) || 0.0;

    setInlinePrices((prev) => ({
      ...prev,
      [factorId]: { ...prev[factorId], saving: true },
    }));

    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${productId}/unit-factors/${factorId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          cost_price: costNum,
          price: priceNum,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'No se pudo guardar el precio.');
      }

      setInlinePrices((prev) => ({
        ...prev,
        [factorId]: { ...prev[factorId], saving: false, saved: true },
      }));

      setSuccessMsg('Precios actualizados ✓');
      setTimeout(() => {
        setSuccessMsg('');
        setInlinePrices((prev) => ({
          ...prev,
          [factorId]: { ...prev[factorId], saved: false },
        }));
      }, 2000);

      // Update product in local state
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const updatedFactors = (p.unit_factors || []).map((uf: any) =>
            uf.id === factorId ? { ...uf, cost_price: costNum, price: priceNum } : uf
          );
          return { ...p, unit_factors: updatedFactors };
        })
      );
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar precio.');
      setInlinePrices((prev) => ({
        ...prev,
        [factorId]: { ...prev[factorId], saving: false },
      }));
    }
  };

  const handleInlineChange = (factorId: number, field: 'cost_price' | 'price', value: string) => {
    setInlinePrices((prev) => ({
      ...prev,
      [factorId]: {
        ...prev[factorId],
        [field]: value,
        saved: false,
      },
    }));
  };

  // Quick Price Modal Save
  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceModal) return;

    const { product, factor: uf, cost_price: cPrice, price: sPrice } = quickPriceModal;
    const costNum = parseFloat(cPrice) || 0.0;
    const priceNum = parseFloat(sPrice) || 0.0;

    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${product.id}/unit-factors/${uf.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          cost_price: costNum,
          price: priceNum,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Error al actualizar precios.');
      }

      setSuccessMsg(`Precios de "${uf.unit_name}" actualizados ✓`);
      setQuickPriceModal(null);
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchProducts();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar precios.');
    }
  };

  // Full Factor Modal Handlers
  const openAddFactorModal = (product: any) => {
    setSelectedProduct(product);
    setEditingFactor(null);
    setUnitName('');
    setFactor('12');
    setIsBase(false);
    setForSale(true);
    setForPurchase(true);
    setCostPrice('0.00');
    setPrice('0.00');
  };

  const openEditFactorModal = (product: any, uf: any) => {
    setSelectedProduct(product);
    setEditingFactor(uf);
    setUnitName(uf.unit_name || '');
    setFactor(String(uf.factor || 1));
    setIsBase(Boolean(uf.is_base));
    setForSale(uf.for_sale !== false);
    setForPurchase(uf.for_purchase !== false);
    setCostPrice(String(uf.cost_price ?? '0.00'));
    setPrice(String(uf.price ?? '0.00'));
  };

  const submitFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const trimmedUnitName = unitName.trim().toUpperCase();
    if (!trimmedUnitName) {
      setErrorMsg('El nombre de la unidad o presentación es obligatorio.');
      return;
    }

    const factorNum = isBase ? 1.0 : parseFloat(factor);
    if (isNaN(factorNum) || factorNum <= 0) {
      setErrorMsg('El factor de conversión debe ser un número mayor a 0.');
      return;
    }

    const existingFactors = (selectedProduct.unit_factors || []).filter(
      (f: any) => !editingFactor || f.id !== editingFactor.id
    );

    const duplicateName = existingFactors.some(
      (f: any) => (f.unit_name || '').trim().toUpperCase() === trimmedUnitName
    );
    if (duplicateName) {
      setErrorMsg(`La unidad "${trimmedUnitName}" ya existe en este producto.`);
      return;
    }

    const duplicateFactor = existingFactors.some(
      (f: any) => Math.abs((f.factor || 1.0) - factorNum) < 0.0001
    );
    if (duplicateFactor) {
      setErrorMsg(
        `El factor equivalente (${factorNum}) ya existe para otra presentación de este producto.`
      );
      return;
    }

    setSubmittingFactor(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const payload = {
        unit_name: trimmedUnitName,
        factor: factorNum,
        is_base: isBase,
        for_sale: forSale,
        for_purchase: forPurchase,
        cost_price: parseFloat(costPrice) || 0.0,
        price: forSale ? parseFloat(price) || 0.0 : 0.0,
      };

      const url = editingFactor
        ? `${API}/api/v1/products/${selectedProduct.id}/unit-factors/${editingFactor.id}`
        : `${API}/api/v1/products/${selectedProduct.id}/unit-factors`;
      const method = editingFactor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Error al guardar el factor.');
      }

      setSuccessMsg(
        editingFactor
          ? `Presentación "${trimmedUnitName}" actualizada ✓`
          : `Nueva presentación "${trimmedUnitName}" agregada ✓`
      );
      setSelectedProduct(null);
      setEditingFactor(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchProducts();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar el factor.');
    } finally {
      setSubmittingFactor(false);
    }
  };

  const deleteFactor = async (productId: number, factorId: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${productId}/unit-factors/${factorId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'No se pudo eliminar el factor.');
      }
      setSuccessMsg('Presentación eliminada ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchProducts();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al eliminar el factor.');
    }
  };

  const filtered = products.filter((p) => {
    const s = search.toLowerCase();
    return (
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s) ||
      (p.brand_name || '').toLowerCase().includes(s)
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
            <Calculator className="w-7 h-7 text-slate-800" />
            Módulo de Precios & Factores de Conversión
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Edita directamente los precios de costo y venta por presentación, y consulta el margen de ganancia en vivo.
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="btn-outline text-xs px-3.5 py-2 font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar Catálogo
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por producto, marca o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 bg-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-auto text-xs bg-white font-semibold"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="input w-auto text-xs bg-white font-semibold"
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products & Unit Factors List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center card">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 mx-auto" />
            <p className="text-xs text-gray-400 mt-2 font-medium">Cargando catálogo de precios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl">
            <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-bold text-sm">
              No se encontraron productos con los filtros seleccionados
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const factorsList = p.unit_factors && p.unit_factors.length > 0 ? p.unit_factors : [];

            return (
              <div
                key={p.id}
                className="card p-5 border border-gray-200 hover:border-slate-400 transition-all rounded-3xl shadow-sm space-y-4"
              >
                {/* Product Header */}
                <div className="flex items-start justify-between flex-wrap gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden flex-shrink-0">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${API}${p.image_url}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{p.name}</h3>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        {p.brand_name && (
                          <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                            {p.brand_name}
                          </span>
                        )}
                        {p.sku && <span className="text-gray-400 font-mono">{p.sku}</span>}
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-600 font-medium">
                          Stock Base: <strong>{p.stock ?? 0} {p.unit_name || 'unid.'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openAddFactorModal(p)}
                    className="btn-dark text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 rounded-xl shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Agregar Otra Presentación
                  </button>
                </div>

                {/* Factors & Pricing Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                    <span>Presentaciones y Factores ({factorsList.length})</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      💡 Modifica los precios de costo o venta y haz clic en <strong>Guardar</strong>
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {factorsList.map((uf: any) => {
                      const inline = inlinePrices[uf.id] || {
                        cost_price: String(uf.cost_price ?? '0.00'),
                        price: String(uf.price ?? '0.00'),
                      };

                      const currentCost = parseFloat(inline.cost_price) || 0;
                      const currentPrice = parseFloat(inline.price) || 0;
                      const profit = currentPrice - currentCost;
                      const marginPct = currentCost > 0 ? ((profit / currentCost) * 100).toFixed(1) : '0.0';

                      return (
                        <div
                          key={uf.id || uf.unit_name}
                          className={`border rounded-2xl p-4 flex flex-col justify-between transition-all gap-3.5 ${
                            uf.is_base
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-800'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          {/* Factor Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                    uf.is_base ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-800 border'
                                  }`}
                                >
                                  {uf.is_base ? '⭐ Factor Base' : `Factor ×${uf.factor}`}
                                </span>
                                <div className="flex gap-1 text-[10px]">
                                  {uf.for_sale && <span title="Habilitado para Venta">🛒 Venta</span>}
                                  {uf.for_purchase && <span title="Habilitado para Compra">📦 Compra</span>}
                                </div>
                              </div>
                              <h4 className="font-extrabold text-sm mt-1.5">{uf.unit_name}</h4>
                              <p className={`text-[11px] font-medium ${uf.is_base ? 'text-slate-300' : 'text-gray-500'}`}>
                                1 {uf.unit_name} = {uf.factor} {p.unit_name || 'unidades'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditFactorModal(p, uf)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  uf.is_base
                                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                    : 'text-gray-400 hover:text-slate-900 hover:bg-gray-100'
                                }`}
                                title="Editar configuración completa del factor"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!uf.is_base && factorsList.length > 1 && (
                                <button
                                  onClick={() => deleteFactor(p.id, uf.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar este factor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Direct Price Edit Inputs */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-gray-200">
                            <div>
                              <label className={`text-[10px] font-bold block mb-1 uppercase ${
                                uf.is_base ? 'text-slate-300' : 'text-gray-500'
                              }`}>
                                Costo (S/)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={inline.cost_price}
                                onChange={(e) => handleInlineChange(uf.id, 'cost_price', e.target.value)}
                                className={`input text-xs font-bold py-1.5 px-2 text-right ${
                                  uf.is_base ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900'
                                }`}
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className={`text-[10px] font-bold block mb-1 uppercase ${
                                uf.is_base ? 'text-slate-300' : 'text-gray-500'
                              }`}>
                                Venta (S/)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={inline.price}
                                onChange={(e) => handleInlineChange(uf.id, 'price', e.target.value)}
                                className={`input text-xs font-black py-1.5 px-2 text-right ${
                                  uf.is_base
                                    ? 'bg-slate-800 text-emerald-400 border-slate-700'
                                    : 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                                }`}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* Live Margin Calculation & Quick Save Button */}
                          <div className="flex items-center justify-between pt-1 gap-2">
                            <div className="min-w-0">
                              <span
                                className={`text-[10px] font-black px-2 py-1 rounded-lg inline-flex items-center gap-1 ${
                                  uf.is_base
                                    ? 'bg-slate-800 text-emerald-300'
                                    : profit >= 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <TrendingUp className="w-3 h-3 flex-shrink-0" />
                                <span>{profit >= 0 ? `+${marginPct}%` : `${marginPct}%`}</span>
                                <span className="font-normal opacity-80">(S/ {profit.toFixed(2)})</span>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveInlinePrice(p.id, uf.id)}
                              disabled={inline.saving}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                                inline.saved
                                  ? 'bg-emerald-600 text-white'
                                  : uf.is_base
                                  ? 'bg-white text-slate-900 hover:bg-gray-100'
                                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                              }`}
                            >
                              {inline.saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : inline.saved ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Guardado
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" /> Guardar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== FULL FACTOR MODAL (ADD / EDIT FULL FACTOR) ===== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  {editingFactor ? 'Configurar Presentación (Factor)' : 'Nueva Presentación (Factor)'}
                </h3>
                <p className="text-xs text-gray-500 font-semibold">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setEditingFactor(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitFactor} className="space-y-4">
              {/* Unit Name */}
              <div>
                <label className="input-label font-bold text-slate-900">
                  Nombre de la Unidad / Presentación *
                </label>
                <input
                  type="text"
                  required
                  list="common-units-list"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value.toUpperCase())}
                  className="input font-bold uppercase text-xs bg-slate-50"
                  placeholder="ej. DOCENA, CAJA x12, PACK x6"
                />
                <datalist id="common-units-list">
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Base Unit Check */}
              <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBase}
                  onChange={(e) => {
                    setIsBase(e.target.checked);
                    if (e.target.checked) setFactor('1.0');
                  }}
                  className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">⭐ Marcar como Factor Base (Unidad Base)</div>
                  <div className="text-[10px] text-gray-500">
                    Establece esta unidad como la referencia base (factor = 1.0).
                  </div>
                </div>
              </label>

              {/* Factor Value */}
              <div>
                <label className="input-label font-bold text-slate-900">
                  Factor Equivalente (Equivalencia en Base) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isBase}
                  required
                  value={isBase ? '1.0' : factor}
                  onChange={(e) => setFactor(e.target.value)}
                  className={`input font-black text-sm ${
                    isBase ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-slate-50 text-slate-900'
                  }`}
                  placeholder="ej. 12"
                />
              </div>

              {/* Checks for Sale and Purchase */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forSale}
                    onChange={(e) => setForSale(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" /> Venta
                    </span>
                    <span className="text-[10px] text-emerald-600 block">Disponible en catálogo</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-blue-50/60 border border-blue-200 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forPurchase}
                    onChange={(e) => setForPurchase(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Compra
                    </span>
                    <span className="text-[10px] text-blue-600 block">Disponible en compras</span>
                  </div>
                </label>
              </div>

              {/* Cost Price & Sale Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label font-bold text-slate-900">
                    P. Compra / Costo (S/)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="input text-base font-bold bg-slate-50"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="input-label font-bold text-slate-900">
                    Precio Venta (S/) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!forSale}
                    required={forSale}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`input text-base font-black ${
                      forSale
                        ? 'bg-emerald-50/50 border-emerald-300 text-slate-900'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setEditingFactor(null);
                  }}
                  className="btn-outline px-4 py-2.5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingFactor}
                  className="btn-dark px-5 py-2.5 text-xs font-bold flex items-center gap-2"
                >
                  {submittingFactor ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : editingFactor ? (
                    'Guardar Cambios'
                  ) : (
                    'Guardar Presentación'
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
