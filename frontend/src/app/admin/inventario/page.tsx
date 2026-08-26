'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes, Search, ArrowUpRight, ArrowDownLeft, SlidersHorizontal,
  History, AlertCircle, Check, Loader2, RefreshCw, X, Filter,
  Package, ShoppingBag, Plus, Minus, FileText, Layers, Sparkles,
  ArrowRight, Calendar, User, Truck,
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

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [kpi, setKpi] = useState<any>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Movement Modal
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [movementType, setMovementType] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [selectedFactor, setSelectedFactor] = useState<any>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [submittingMovement, setSubmittingMovement] = useState(false);

  // Kardex History Modal
  const [kardexProduct, setKardexProduct] = useState<any>(null);
  const [kardexLogs, setKardexLogs] = useState<any[]>([]);
  const [loadingKardex, setLoadingKardex] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchBrands();
  }, [categoryFilter, brandFilter, statusFilter]);

  const handleUnauthorized = () => {
    setErrorMsg('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    setTimeout(() => {
      localStorage.removeItem('chatya_token');
      router.replace('/admin/login?expired=true');
    }, 1500);
  };

  const fetchInventory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (brandFilter) params.set('brand_name', brandFilter);
      if (statusFilter) params.set('stock_status', statusFilter);

      const res = await fetch(`${API}/api/v1/inventory/summary?${params}`, { headers });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setItems(d.data || []);
        setKpi(d.kpi || {});
      } else {
        setErrorMsg('Error al cargar inventario.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión al cargar inventario.');
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

  const openMovementModal = (product: any, type: 'ENTRADA' | 'SALIDA' | 'AJUSTE') => {
    setSelectedProduct(product);
    setMovementType(type);
    setQuantity(type === 'AJUSTE' ? String(product.stock_fisico) : '1');
    setReason('');

    const factors = product.unit_factors || [];
    let initialFactor = factors.find((f: any) => f.is_base);
    if (!initialFactor && factors.length > 0) initialFactor = factors[0];
    if (!initialFactor) {
      initialFactor = { factor: 1.0, unit_name: product.unit_name || 'UNIDAD', is_base: true };
    }
    setSelectedFactor(initialFactor);
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Ingresa una cantidad válida mayor a 0.');
      return;
    }

    setSubmittingMovement(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const factorVal = selectedFactor?.factor ? parseFloat(selectedFactor.factor) : 1.0;
      const unitLabel = selectedFactor?.unit_name || selectedProduct.unit_name || 'UNIDAD';

      const res = await fetch(`${API}/api/v1/inventory/movements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: selectedProduct.id,
          movement_type: movementType,
          quantity: qtyNum,
          unit_factor: factorVal,
          unit_label: unitLabel,
          reason,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Error al registrar movimiento.');
      }

      const d = await res.json();
      setSuccessMsg(d.message || 'Movimiento de inventario registrado con éxito ✓');
      setSelectedProduct(null);
      setTimeout(() => setSuccessMsg(''), 3500);
      fetchInventory();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al registrar movimiento.');
    } finally {
      setSubmittingMovement(false);
    }
  };

  const openKardex = async (product: any) => {
    setKardexProduct(product);
    setLoadingKardex(true);
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/inventory/movements?product_id=${product.id}&limit=100`, {
        headers,
      });
      if (res.ok) {
        const d = await res.json();
        setKardexLogs(d.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingKardex(false);
    }
  };

  const filtered = items.filter((p) => {
    const s = search.toLowerCase();
    return (
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s) ||
      (p.brand_name || '').toLowerCase().includes(s)
    );
  });

  // Calculate live preview in modal
  const inputQty = parseFloat(quantity) || 0;
  const currentFactorVal = selectedFactor?.factor ? parseFloat(selectedFactor.factor) : 1.0;
  const convertedBaseQty = movementType === 'AJUSTE' ? inputQty : Math.round(inputQty * currentFactorVal);
  const currentStockFisico = selectedProduct?.stock_fisico || 0;
  const projectedStock =
    movementType === 'ENTRADA'
      ? currentStockFisico + convertedBaseQty
      : movementType === 'SALIDA'
      ? Math.max(0, currentStockFisico - convertedBaseQty)
      : convertedBaseQty;

  return (
    <div className="space-y-5">
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
          <h1 className="text-2xl font-bold text-gray-900">Control de Inventarios & Kardex</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestión de stock físico base, conversiones automáticas por factor y registro de movimientos
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="btn-outline text-xs px-3.5 py-2 font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar Stock
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-l-slate-900 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold">Stock Físico Total</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpi.total_physical_stock || 0}</div>
          <div className="text-[11px] text-gray-400 mt-1">Unidades base en almacén</div>
        </div>

        <div className="card p-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold">Stock Comprometido</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{kpi.total_committed_stock || 0}</div>
          <div className="text-[11px] text-amber-700 font-bold mt-1">En pedidos pendientes</div>
        </div>

        <div className="card p-4 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold">Stock Disponible</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{kpi.total_available_stock || 0}</div>
          <div className="text-[11px] text-gray-400 mt-1">Físico − Comprometido</div>
        </div>

        <div className="card p-4 border-l-4 border-l-red-500 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold">Alertas de Stock</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {(kpi.out_of_stock_count || 0) + (kpi.low_stock_count || 0)}
          </div>
          <div className="text-[11px] text-red-600 font-bold mt-1">
            {kpi.out_of_stock_count || 0} agotados · {kpi.low_stock_count || 0} stock bajo
          </div>
        </div>
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto text-xs bg-white font-semibold"
        >
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="low">Stock Bajo</option>
          <option value="out_of_stock">Agotado</option>
        </select>
      </div>

      {/* Main Inventory Table */}
      <div className="card overflow-hidden border border-gray-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 mx-auto" />
            <p className="text-xs text-gray-400 mt-2 font-medium">Cargando inventario...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl m-4">
            <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-bold text-sm">
              No se encontraron productos con los filtros seleccionados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Producto / Marca</th>
                  <th className="py-3 px-4 text-left">Categoría</th>
                  <th className="py-3 px-4 text-left">Stock Físico (Base y Factores Convertidos)</th>
                  <th className="py-3 px-4 text-left">Comprometido</th>
                  <th className="py-3 px-4 text-left">Disponible</th>
                  <th className="py-3 px-4 text-left">Estado</th>
                  <th className="py-3 px-4 text-left">Movimientos</th>
                  <th className="py-3 px-4 text-left">Kardex</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const factorsList = p.unit_factors && p.unit_factors.length > 0 ? p.unit_factors : [];
                  const baseFactor = factorsList.find((f: any) => f.is_base) || { unit_name: p.unit_name || 'UNIDAD', factor: 1.0 };
                  const otherFactors = factorsList.filter((f: any) => !f.is_base && f.factor > 1);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${API}${p.image_url}`}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{p.name}</div>
                            <div className="flex items-center gap-2 text-[11px] mt-0.5">
                              {p.brand_name && (
                                <span className="text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                  {p.brand_name}
                                </span>
                              )}
                              {p.sku && <span className="text-gray-400 font-mono">{p.sku}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-gray-600 font-semibold">{p.category_name}</td>

                      {/* Stock Físico Base & Other Converted Factors */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {/* Base physical minimum quantity */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-sm">
                              {p.stock_fisico}
                            </span>
                            <span className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 rounded-md uppercase">
                              {baseFactor.unit_name} (Base)
                            </span>
                          </div>

                          {/* Converted Presentations */}
                          {otherFactors.length > 0 && (
                            <div className="space-y-0.5 pt-0.5 border-t border-gray-100">
                              {otherFactors.map((uf: any) => {
                                const equiv = (p.stock_fisico / uf.factor).toFixed(2);
                                const cleanEquiv = equiv.endsWith('.00') ? parseInt(equiv) : equiv;
                                return (
                                  <div
                                    key={uf.id}
                                    className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold"
                                  >
                                    <span className="text-slate-400">↳</span>
                                    <span>= <strong className="text-slate-900">{cleanEquiv}</strong> {uf.unit_name}</span>
                                    <span className="text-[10px] text-gray-400">(x{uf.factor})</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Stock Comprometido */}
                      <td className="py-3 px-4">
                        {p.stock_comprometido > 0 ? (
                          <span
                            className="bg-amber-100 text-amber-900 font-bold px-2 py-1 rounded-lg text-[11px]"
                            title="Reservado en pedidos activos"
                          >
                            {p.stock_comprometido} res.
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Stock Disponible */}
                      <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                        {p.stock_disponible} {baseFactor.unit_name}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {p.is_out_of_stock ? (
                          <span className="bg-red-50 text-red-700 border border-red-200 font-bold px-2.5 py-1 rounded-xl text-[11px]">
                            Agotado
                          </span>
                        ) : p.is_low_stock ? (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded-xl text-[11px]">
                            Stock Bajo (mín {p.min_stock})
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-xl text-[11px]">
                            Disponible
                          </span>
                        )}
                      </td>

                      {/* Stock Actions (Entrada / Salida / Ajuste) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openMovementModal(p, 'ENTRADA')}
                            className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl font-bold transition-all shadow-sm"
                            title="Registrar Entrada / Compra (+)"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" /> Entrada
                          </button>

                          <button
                            onClick={() => openMovementModal(p, 'SALIDA')}
                            className="flex items-center gap-1 text-[11px] bg-red-50 text-red-800 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-xl font-bold transition-all shadow-sm"
                            title="Registrar Salida / Ajuste (-)"
                          >
                            <Minus className="w-3.5 h-3.5 text-red-600" /> Salida
                          </button>

                          <button
                            onClick={() => openMovementModal(p, 'AJUSTE')}
                            className="text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 px-2.5 py-1.5 rounded-xl font-bold transition-all"
                            title="Ajuste directo de stock"
                          >
                            Ajuste
                          </button>
                        </div>
                      </td>

                      {/* Kardex */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openKardex(p)}
                          className="flex items-center gap-1 text-[11px] text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold transition-all shadow-sm"
                        >
                          <History className="w-3.5 h-3.5 text-slate-600" /> Kardex
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MOVEMENT MODAL (ENTRADA / SALIDA / AJUSTE CON FACTOR) ===== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  {movementType === 'ENTRADA' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <ArrowDownLeft className="w-5 h-5" /> Entrada de Mercadería / Compra (+)
                    </span>
                  ) : movementType === 'SALIDA' ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <ArrowUpRight className="w-5 h-5" /> Salida / Egreso de Mercadería (−)
                    </span>
                  ) : (
                    <span className="text-slate-800 flex items-center gap-1">
                      <SlidersHorizontal className="w-5 h-5" /> Ajuste Físico de Inventario
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  {selectedProduct.name} ({selectedProduct.brand_name})
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitMovement} className="space-y-4">
              {/* Current Stock Recap */}
              <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-200">
                <div>
                  <p className="text-xs text-gray-500 font-bold">Stock Físico Actual</p>
                  <p className="text-xl font-black text-slate-900">
                    {selectedProduct.stock_fisico} {selectedProduct.unit_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-bold">Comprometido</p>
                  <p className="text-xl font-black text-amber-700">
                    {selectedProduct.stock_comprometido}
                  </p>
                </div>
              </div>

              {/* Unit presentation selector with factors */}
              {movementType !== 'AJUSTE' && (
                <div>
                  <label className="input-label font-bold text-slate-900">
                    Seleccionar Unidad / Presentación de {movementType === 'ENTRADA' ? 'Ingreso' : 'Salida'}
                  </label>
                  <select
                    value={selectedFactor?.unit_name || selectedProduct.unit_name || 'UNIDAD'}
                    onChange={(e) => {
                      const uName = e.target.value;
                      const allFactors = selectedProduct.unit_factors || [];
                      const found = allFactors.find((f: any) => f.unit_name === uName);
                      if (found) {
                        setSelectedFactor(found);
                      } else {
                        setSelectedFactor({ factor: 1.0, unit_name: uName });
                      }
                    }}
                    className="input font-bold text-xs bg-slate-50"
                  >
                    {(selectedProduct.unit_factors && selectedProduct.unit_factors.length > 0
                      ? selectedProduct.unit_factors
                      : [{ unit_name: selectedProduct.unit_name || 'UNIDAD', factor: 1.0, is_base: true }]
                    ).map((uf: any) => (
                      <option key={uf.id || uf.unit_name} value={uf.unit_name}>
                        {uf.unit_name} {uf.is_base ? '(Unidad Base ×1)' : `(Factor de Conversión ×${uf.factor})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity Input */}
              <div>
                <label className="input-label font-bold text-slate-900">
                  {movementType === 'AJUSTE'
                    ? `Nuevo Stock Total Físico (${selectedProduct.unit_name}) *`
                    : `Cantidad a ${movementType === 'ENTRADA' ? 'Ingresar' : 'Retirar'} (${selectedFactor?.unit_name || 'unidades'}) *`}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input text-lg font-black text-slate-900"
                  placeholder="ej. 10"
                  autoFocus
                />
              </div>

              {/* Conversion Preview Box */}
              {movementType !== 'AJUSTE' && (
                <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-2 shadow-md">
                  <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-700 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" /> Conversión a Stock Base:
                    </span>
                    <span className="text-emerald-400 font-extrabold">
                      {inputQty} {selectedFactor?.unit_name || 'unid'} × Factor {currentFactorVal} = {convertedBaseQty} {selectedProduct.unit_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">Stock Resultante Proyectado:</span>
                    <span className="text-white font-black text-sm">
                      {currentStockFisico} → {projectedStock} {selectedProduct.unit_name}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="input-label font-bold text-slate-900">
                  Motivo / Documento de Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input text-xs font-semibold"
                  placeholder="ej. Factura Compra F001-234, Merma, Ajuste de inventario..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="btn-outline px-4 py-2.5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMovement}
                  className="btn-dark px-6 py-2.5 text-xs font-bold flex items-center gap-2"
                >
                  {submittingMovement && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar y Actualizar Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== KARDEX HISTORY MODAL ===== */}
      {kardexProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-800" /> Kardex Físico — {kardexProduct.name}
                </h3>
                <p className="text-xs text-gray-500 font-semibold">
                  Historial de entradas, salidas y ventas registradas
                </p>
              </div>
              <button
                onClick={() => setKardexProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingKardex ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-800 mx-auto" />
                <p className="text-xs text-gray-400 mt-2 font-medium">Cargando kardex...</p>
              </div>
            ) : kardexLogs.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 font-bold text-sm">No hay movimientos registrados para este producto</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Fecha</th>
                      <th className="py-2.5 px-3 text-left">Tipo</th>
                      <th className="py-2.5 px-3 text-left">Cantidad</th>
                      <th className="py-2.5 px-3 text-left">Stock Anterior</th>
                      <th className="py-2.5 px-3 text-left">Nuevo Stock</th>
                      <th className="py-2.5 px-3 text-left">Motivo / Ref</th>
                      <th className="py-2.5 px-3 text-left">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kardexLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              log.movement_type === 'ENTRADA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.movement_type === 'SALIDA' || log.movement_type === 'VENTA'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.movement_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900">
                          {log.movement_type === 'ENTRADA' ? `+${log.quantity}` : `-${log.quantity}`}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 font-semibold">{log.previous_stock}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{log.new_stock}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{log.reason || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-400">{log.user_name || 'Sistema'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
