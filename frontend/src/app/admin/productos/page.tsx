'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Plus, Search, Pencil, Trash2, Loader2,
  Star, Eye, X, Check, Upload, ChevronLeft,
  Calculator, Tag, Sparkles, Filter, AlertCircle, RefreshCw,
  Layers, ShoppingCart, Truck, CheckCircle2, ArrowRight, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

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

interface UnitFactorItem {
  id?: number;
  unit_name: string;
  factor: number;
  is_base: boolean;
  for_sale: boolean;
  for_purchase: boolean;
  cost_price: string;
  price: string;
}

const DEFAULT_BASE_FACTOR: UnitFactorItem = {
  unit_name: 'UNIDAD',
  factor: 1.0,
  is_base: true,
  for_sale: true,
  for_purchase: true,
  cost_price: '0.00',
  price: '0.00',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  sku: '',
  brand_id: '',
  brand_name: '',
  previous_price: '',
  max_per_order: '99',
  category_id: '',
  is_active: true,
  is_featured: false,
  show_in_store: false, // Default FALSE
  allow_unit_selection: true, // Permitir al cliente elegir factores en la tienda
  sort_order: '0',
};

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

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [unitFactors, setUnitFactors] = useState<UnitFactorItem[]>([DEFAULT_BASE_FACTOR]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [companySlug, setCompanySlug] = useState('demo');

  useEffect(() => {
    const slug = localStorage.getItem('chatya_company_slug') || 'demo';
    setCompanySlug(slug);
    Promise.all([fetchProducts(), fetchCategories(), fetchBrands()]);
  }, []);

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
      const res = await fetch(`${API}/api/v1/products/`, { headers });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setProducts(d.data || d || []);
      } else {
        setErrorMsg('No se pudieron obtener los productos.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión al cargar productos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/brands/`, { headers });
      if (res.ok) {
        const d = await res.json();
        setBrandsList(d.data || d || []);
      }
    } catch (e) {
      console.error(e);
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

  // Unit factors handlers
  const addUnitFactor = () => {
    setUnitFactors((prev) => [
      ...prev,
      {
        unit_name: '',
        factor: 1.0,
        is_base: false,
        for_sale: true,
        for_purchase: true,
        cost_price: '0.00',
        price: '0.00',
      },
    ]);
  };

  const removeUnitFactor = (index: number) => {
    if (unitFactors.length <= 1) {
      setErrorMsg('El producto debe tener al menos una unidad de medida.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    const target = unitFactors[index];
    const updated = unitFactors.filter((_, i) => i !== index);
    if (target.is_base && updated.length > 0) {
      updated[0].is_base = true;
      updated[0].factor = 1.0;
    }
    setUnitFactors(updated);
  };

  const setBaseFactor = (index: number) => {
    setUnitFactors((prev) =>
      prev.map((uf, i) => ({
        ...uf,
        is_base: i === index,
        factor: i === index ? 1.0 : uf.factor,
      }))
    );
  };

  const updateUnitFactorField = (index: number, field: keyof UnitFactorItem, value: any) => {
    setUnitFactors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM); // show_in_store is false by default
    setUnitFactors([{ ...DEFAULT_BASE_FACTOR }]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      sku: p.sku || '',
      brand_id: p.brand_id ? String(p.brand_id) : '',
      brand_name: p.brand_name || '',
      previous_price: p.previous_price ? String(p.previous_price) : '',
      max_per_order: String(p.max_per_order ?? '99'),
      category_id: p.category_id ? String(p.category_id) : '',
      is_active: p.is_active ?? true,
      is_featured: p.is_featured ?? false,
      show_in_store: p.show_in_store ?? false,
      allow_unit_selection: p.allow_unit_selection !== false,
      sort_order: String(p.sort_order ?? '0'),
    });

    if (p.unit_factors && p.unit_factors.length > 0) {
      setUnitFactors(
        p.unit_factors.map((uf: any) => ({
          id: uf.id,
          unit_name: uf.unit_name || 'UNIDAD',
          factor: Number(uf.factor || 1.0),
          is_base: Boolean(uf.is_base),
          for_sale: uf.for_sale !== false,
          for_purchase: uf.for_purchase !== false,
          cost_price: String(uf.cost_price ?? '0.00'),
          price: String(uf.price ?? '0.00'),
        }))
      );
    } else {
      setUnitFactors([
        {
          unit_name: p.unit_name || 'UNIDAD',
          factor: 1.0,
          is_base: true,
          for_sale: true,
          for_purchase: true,
          cost_price: String(p.cost_price || '0.00'),
          price: String(p.price || '0.00'),
        },
      ]);
    }

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }

    // Validate unit factors
    if (unitFactors.length === 0) {
      setErrorMsg('Debes agregar al menos una unidad de medida.');
      return;
    }

    const unitNames = unitFactors.map((uf) => uf.unit_name.trim().toUpperCase());
    const hasEmpty = unitNames.some((u) => !u);
    if (hasEmpty) {
      setErrorMsg('Todas las unidades de medida deben tener un nombre (ej. UNIDAD, DOCENA, CAJA).');
      return;
    }

    const uniqueUnits = new Set(unitNames);
    if (uniqueUnits.size !== unitNames.length) {
      setErrorMsg('No puedes repetir nombres de unidades en el mismo producto. Cada factor debe tener una unidad diferente.');
      return;
    }

    // Validate non-duplicate factor values
    const factorValues = unitFactors.map((uf) =>
      uf.is_base ? 1.0 : parseFloat(String(uf.factor)) || 1.0
    );
    const hasInvalidFactor = factorValues.some((f) => f <= 0 || isNaN(f));
    if (hasInvalidFactor) {
      setErrorMsg('Todos los factores equivalentes deben ser números mayores a 0.');
      return;
    }

    const uniqueFactors = new Set(factorValues);
    if (uniqueFactors.size !== factorValues.length) {
      setErrorMsg(
        'No puedes tener dos presentaciones con el mismo valor equivalente (ej. factor 1.0 o 12.0 repetido). Cada factor debe tener un valor de conversión único.'
      );
      return;
    }

    const hasBase = unitFactors.some((uf) => uf.is_base);
    if (!hasBase) {
      setErrorMsg('Debes marcar una unidad como Factor Base (Unidad Base).');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = getAuthHeader();
      const payload: any = {
        name: form.name.trim(),
        description: form.description,
        sku: form.sku,
        brand_id: form.brand_id ? parseInt(form.brand_id) : null,
        brand_name: form.brand_name.trim(),
        previous_price: form.previous_price ? parseFloat(form.previous_price) : null,
        max_per_order: parseInt(form.max_per_order) || 99,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        is_active: form.is_active,
        is_featured: form.is_featured,
        show_in_store: form.show_in_store,
        allow_unit_selection: form.allow_unit_selection,
        sort_order: parseInt(form.sort_order) || 0,
        unit_factors: unitFactors.map((uf) => ({
          unit_name: uf.unit_name.trim().toUpperCase(),
          factor: uf.is_base ? 1.0 : parseFloat(String(uf.factor)) || 1.0,
          is_base: uf.is_base,
          for_sale: uf.for_sale,
          for_purchase: uf.for_purchase,
          cost_price: parseFloat(uf.cost_price) || 0.0,
          price: uf.for_sale ? parseFloat(uf.price) || 0.0 : 0.0,
        })),
      };

      const url = editing
        ? `${API}/api/v1/products/${editing.id}`
        : `${API}/api/v1/products/`;
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'No se pudo guardar el producto.');
      }

      setSuccessMsg(editing ? 'Producto y factores actualizados ✓' : 'Producto creado exitosamente ✓');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 3000);

      fetchProducts();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      setDeleteId(null);
      setSuccessMsg('Producto eliminado ✓');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchProducts();
    } catch (e) {
      console.error(e);
      setErrorMsg('No se pudo eliminar el producto.');
    }
  };

  const toggleActive = async (p: any) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${p.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, is_active: !p.is_active } : item))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageUpload = async (productId: number, file: File, setAsPrimary = false) => {
    setUploadingFor(productId);
    try {
      const token = localStorage.getItem('chatya_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${API}/api/v1/products/${productId}/images?is_primary=${setAsPrimary}`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      if (res.ok) {
        setSuccessMsg('Foto subida con éxito ✓');
        setTimeout(() => setSuccessMsg(''), 2500);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('No se pudo subir la foto.');
    } finally {
      setUploadingFor(null);
    }
  };

  const handleDeleteImage = async (productId: number, imageId: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setPrimaryImage = async (productId: number, imageId: number) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API}/api/v1/products/${productId}/images/${imageId}/primary`, {
        method: 'PUT',
        headers,
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const brands = Array.from(new Set(products.map((p) => p.brand_name).filter(Boolean)));

  const filtered = products.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s) ||
      (p.brand_name || '').toLowerCase().includes(s);
    const matchCat = !categoryFilter || String(p.category_id) === categoryFilter;
    const matchBrand = !brandFilter || p.brand_name === brandFilter;
    return matchSearch && matchCat && matchBrand;
  });

  const catName = (id: number) => categories.find((c) => c.id === id)?.name || '—';

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
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products.length} productos · costos de compra, precios de venta, márgenes y catálogo virtual
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={fetchProducts} className="btn-outline text-xs px-3 py-2 font-bold">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href={`/${companySlug}?preview=true`}
            target="_blank"
            className="btn-outline text-xs px-3.5 py-2 font-bold flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" /> Ver Tienda
          </Link>
          <button onClick={openCreate} className="btn-dark text-xs px-4 py-2 font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* ===== PRODUCT CREATION & EDIT MODAL / FORM ===== */}
      {showForm && (
        <div className="card p-6 border-2 border-slate-300 space-y-6 shadow-xl rounded-3xl">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                {editing ? `Editar Producto: ${editing.name}` : 'Crear Nuevo Producto'}
              </h2>
              <p className="text-xs text-gray-500">
                Registra los datos generales, define precios de compra/venta por factor y visibilidad
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Basic Data */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="input-label font-bold text-slate-900">Nombre del Producto *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
                  className="input font-semibold"
                  placeholder="ej. Laptop Pro 15, Gaseosa Inka Cola 500ml, Arroz Costeño..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="input-label font-bold text-slate-900 mb-0">Marca del Producto</label>
                  <Link
                    href="/admin/marcas"
                    target="_blank"
                    className="text-xs text-slate-700 hover:underline font-bold flex items-center gap-1"
                  >
                    + Gestionar Marcas
                  </Link>
                </div>
                <div className="flex gap-2">
                  <select
                    value={form.brand_id || (brandsList.find((b) => b.name === form.brand_name)?.id || '')}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = brandsList.find((b) => String(b.id) === selectedId);
                      setForm((f: any) => ({
                        ...f,
                        brand_id: selectedId ? parseInt(selectedId) : null,
                        brand_name: found ? found.name : f.brand_name,
                      }));
                    }}
                    className="input flex-1"
                  >
                    <option value="">-- Seleccionar Marca --</option>
                    {brandsList.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.brand_name || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, brand_name: e.target.value }))}
                    className="input w-36 text-xs"
                    placeholder="o escribe otra..."
                    title="Escribe un nombre de marca si no está en la lista"
                  />
                </div>
              </div>

              <div>
                <label className="input-label font-bold text-slate-900">Categoría</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((f: any) => ({ ...f, category_id: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label font-bold text-slate-900">SKU / Código Principal</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f: any) => ({ ...f, sku: e.target.value }))}
                  className="input font-mono"
                  placeholder="SKU-1001"
                />
              </div>

              <div>
                <label className="input-label font-bold text-slate-900">Límite Máx. por Pedido</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_per_order}
                  onChange={(e) => setForm((f: any) => ({ ...f, max_per_order: e.target.value }))}
                  className="input"
                  placeholder="99"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="input-label font-bold text-slate-900">Descripción del Producto</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="input resize-none"
                  placeholder="Describe detalles del producto, especificaciones, presentación o características..."
                />
              </div>
            </div>

            {/* 2. Factores de Conversión, Precios de Compra/Venta y Márgenes */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">
                      Factores de Conversión, Precios de Compra/Venta y Márgenes
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Define el costo de compra y precio de venta para ver el margen de ganancia en cada presentación.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addUnitFactor}
                  className="btn-dark text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 rounded-xl shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Otra Presentación / Factor
                </button>
              </div>

              {/* Factors Table / List */}
              <div className="space-y-3">
                {unitFactors.map((uf, idx) => {
                  const costVal = parseFloat(uf.cost_price) || 0;
                  const priceVal = parseFloat(uf.price) || 0;
                  const profitVal = priceVal - costVal;
                  const marginPct = costVal > 0 ? ((profitVal / costVal) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        uf.is_base
                          ? 'bg-white border-slate-800 shadow-md ring-1 ring-slate-800'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="grid sm:grid-cols-12 gap-3 items-center">
                        {/* Base Checkbox */}
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900">
                            <input
                              type="checkbox"
                              checked={uf.is_base}
                              onChange={() => setBaseFactor(idx)}
                              className="w-4 h-4 rounded-full accent-slate-900 cursor-pointer"
                            />
                            <span>{uf.is_base ? '⭐ Factor Base' : 'Hacer Base'}</span>
                          </label>
                        </div>

                        {/* Unit Name */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                            Unidad de Medida *
                          </label>
                          <input
                            type="text"
                            required
                            list={`units-list-${idx}`}
                            value={uf.unit_name}
                            onChange={(e) =>
                              updateUnitFactorField(idx, 'unit_name', e.target.value.toUpperCase())
                            }
                            className="input text-xs font-bold py-2 bg-slate-50 uppercase"
                            placeholder="ej. UNIDAD"
                          />
                          <datalist id={`units-list-${idx}`}>
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u} />
                            ))}
                          </datalist>
                        </div>

                        {/* Factor */}
                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                            Factor
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            disabled={uf.is_base}
                            value={uf.is_base ? 1.0 : uf.factor}
                            onChange={(e) =>
                              updateUnitFactorField(idx, 'factor', parseFloat(e.target.value) || 1.0)
                            }
                            className={`input text-xs font-bold py-2 text-center ${
                              uf.is_base ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-slate-50'
                            }`}
                          />
                        </div>

                        {/* Usage Checks */}
                        <div className="sm:col-span-2 flex flex-col gap-1 justify-center">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={uf.for_sale}
                              onChange={(e) => updateUnitFactorField(idx, 'for_sale', e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                            />
                            <span className="flex items-center gap-1 text-emerald-700">
                              <ShoppingCart className="w-3 h-3" /> Venta
                            </span>
                          </label>

                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={uf.for_purchase}
                              onChange={(e) => updateUnitFactorField(idx, 'for_purchase', e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                            />
                            <span className="flex items-center gap-1 text-blue-700">
                              <Truck className="w-3 h-3" /> Compra
                            </span>
                          </label>
                        </div>

                        {/* Precio Compra (Costo) */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                            P. Compra / Costo (S/)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={uf.cost_price}
                            onChange={(e) => updateUnitFactorField(idx, 'cost_price', e.target.value)}
                            className="input text-xs font-bold py-2 text-right bg-slate-50"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Precio Venta */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                            Precio Venta (S/)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={!uf.for_sale}
                            value={uf.price}
                            onChange={(e) => updateUnitFactorField(idx, 'price', e.target.value)}
                            className={`input text-xs font-black py-2 text-right ${
                              uf.for_sale
                                ? 'bg-emerald-50/50 border-emerald-300 text-slate-900'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            placeholder="0.00"
                          />
                        </div>

                        {/* Delete row */}
                        <div className="sm:col-span-1 text-right">
                          {unitFactors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeUnitFactor(idx)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Eliminar factor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Live Profit Margin Badge */}
                      {uf.for_sale && (costVal > 0 || priceVal > 0) && (
                        <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                            <span>Margen de Ganancia:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">
                              Ganancia: <strong>S/ {profitVal.toFixed(2)}</strong>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                                profitVal > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : profitVal < 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {profitVal >= 0 ? `+${marginPct}%` : `${marginPct}%`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Visibility and Customer Selection Settings */}
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Check 1: Show in store (Default FALSE on create) */}
              <label className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.show_in_store}
                  onChange={(e) => setForm((f: any) => ({ ...f, show_in_store: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-900 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-gray-900">🌐 Publicar en Tienda Virtual</div>
                  <div className="text-[11px] text-gray-500">
                    Si está marcado, el producto será visible para los clientes en el catálogo online.
                  </div>
                </div>
              </label>

              {/* Check 2: Allow customer to choose presentation in store */}
              <label className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.allow_unit_selection}
                  onChange={(e) => setForm((f: any) => ({ ...f, allow_unit_selection: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-900 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-gray-900">🛒 Permitir al cliente elegir presentación</div>
                  <div className="text-[11px] text-gray-500">
                    El cliente podrá seleccionar comprar por Unidad, Docena o Caja en la tienda.
                  </div>
                </div>
              </label>

              {/* Check 3: Active in system */}
              <label className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-900 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-gray-900">✅ Producto Activo</div>
                  <div className="text-[11px] text-gray-500">Habilitado para operaciones del sistema.</div>
                </div>
              </label>

              {/* Check 4: Featured */}
              <label className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm((f: any) => ({ ...f, is_featured: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-900 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-gray-900">⭐ Producto Destacado</div>
                  <div className="text-[11px] text-gray-500">Aparece en la sección principal de populares.</div>
                </div>
              </label>
            </div>

            {/* Form actions */}
            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline px-5 py-2.5 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-dark px-6 py-2.5 font-bold text-xs flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : editing ? (
                  'Guardar Cambios del Producto'
                ) : (
                  'Crear Producto'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, marca o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-auto bg-white"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {brands.length > 0 && (
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="input w-auto bg-white"
          >
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden border border-gray-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 mx-auto" />
            <p className="text-xs text-gray-400 mt-2 font-medium">Cargando productos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl m-4">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-bold text-sm">
              {search || categoryFilter || brandFilter
                ? 'No encontramos productos con esos filtros'
                : 'Aún no tienes productos creados'}
            </p>
            <button onClick={openCreate} className="mt-3 text-xs text-slate-900 font-bold hover:underline">
              + Crear primer producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Producto / Marca</th>
                  <th className="py-3 px-4 text-left">Categoría</th>
                  <th className="py-3 px-4 text-left">Presentaciones, Costos & Precios</th>
                  <th className="py-3 px-4 text-left">Tienda Virtual</th>
                  <th className="py-3 px-4 text-left">Stock Físico</th>
                  <th className="py-3 px-4 text-left">Fotos</th>
                  <th className="py-3 px-4 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p: any) => {
                  const outOfStock = p.stock === 0;
                  const lowStock = p.stock > 0 && p.stock <= (p.min_stock || 2);
                  const factorsList = p.unit_factors && p.unit_factors.length > 0 ? p.unit_factors : [];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Name & Brand */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Main Image Thumbnail */}
                          <div className="w-11 h-11 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 relative group flex items-center justify-center">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${API}${p.image_url}`}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-300" />
                            )}
                            {/* Upload overlay */}
                            <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                              {uploadingFor === p.id ? (
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 text-white" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(p.id, file, !p.image_url);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1 truncate">
                              {p.name}
                              {p.is_featured && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                              )}
                            </div>
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
                      <td className="py-3 px-4 text-gray-600 font-semibold">{catName(p.category_id)}</td>

                      {/* Multi-Unit Factors, Cost & Sale Price */}
                      <td className="py-3 px-4">
                        {factorsList.length > 0 ? (
                          <div className="space-y-1 max-w-xs">
                            {factorsList.map((uf: any, uIdx: number) => {
                              const cost = Number(uf.cost_price || 0);
                              const price = Number(uf.price || 0);
                              const profit = price - cost;
                              const margin = cost > 0 ? ((profit / cost) * 100).toFixed(0) : '0';

                              return (
                                <div
                                  key={uIdx}
                                  className={`text-[11px] px-2 py-1 rounded-lg border flex items-center justify-between gap-2 ${
                                    uf.is_base
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-slate-50 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  <span className="font-bold truncate">
                                    {uf.unit_name} {uf.is_base ? '(Base)' : `(x${uf.factor})`}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 font-bold">
                                    {uf.for_sale && (
                                      <span className={uf.is_base ? 'text-emerald-300' : 'text-emerald-700'}>
                                        S/ {price.toFixed(2)}
                                      </span>
                                    )}
                                    {cost > 0 && price > 0 && (
                                      <span
                                        className={`text-[9px] px-1 py-0.2 rounded ${
                                          uf.is_base
                                            ? 'bg-slate-800 text-emerald-300'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        +{margin}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-700 font-bold">
                            {p.unit_name || 'UNIDAD'} · S/ {Number(p.price || 0).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Tienda Virtual & Client Selection Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-block ${
                              p.show_in_store
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            {p.show_in_store ? '🌐 En Catálogo' : '🔒 Oculto en Tienda'}
                          </span>
                          {p.show_in_store && (
                            <div className="text-[10px] text-gray-500 font-medium">
                              {p.allow_unit_selection !== false ? '✓ Cliente elige factor' : 'Solo unidad base'}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-black text-sm ${
                            outOfStock ? 'text-red-500' : lowStock ? 'text-amber-600' : 'text-slate-900'
                          }`}
                        >
                          {p.stock ?? 0} {p.unit_name || 'unid.'}
                        </span>
                        {outOfStock && <div className="text-[10px] text-red-500 font-bold">Agotado</div>}
                        {lowStock && <div className="text-[10px] text-amber-600 font-bold">Stock bajo</div>}
                      </td>

                      {/* Image Gallery */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(p.images || []).map((img: any) => (
                            <div key={img.id} className="relative group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`${API}${img.url}`}
                                alt=""
                                className={`w-8 h-8 rounded-lg object-cover border-2 ${
                                  img.is_primary ? 'border-slate-800 shadow-sm' : 'border-gray-200'
                                }`}
                              />
                              <div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 bg-black/80 rounded-lg p-0.5">
                                {!img.is_primary && (
                                  <button
                                    onClick={() => setPrimaryImage(p.id, img.id)}
                                    title="Marcar como principal"
                                    className="p-0.5 text-amber-300 hover:text-amber-200"
                                  >
                                    ★
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteImage(p.id, img.id)}
                                  title="Eliminar imagen"
                                  className="p-0.5 text-red-400 hover:text-red-300"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                          <label className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-800 hover:bg-slate-50 transition-colors">
                            {uploadingFor === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 text-slate-800 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(p.id, file, (p.images || []).length === 0);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-slate-900 transition-colors"
                            title="Editar producto y factores"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteId === p.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="text-xs text-red-600 font-bold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100"
                              >
                                ¿Eliminar?
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="text-xs text-gray-500 px-1 py-1"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(p.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
