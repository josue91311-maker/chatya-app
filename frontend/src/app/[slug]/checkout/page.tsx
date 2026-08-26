'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import {
  ChevronLeft, Truck, Store, User, Phone, CreditCard,
  MapPin, FileText, AlertCircle, ChevronRight, Check, Loader2, Eye,
  Sparkles, Lock, Navigation, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type DeliveryMethod = 'delivery' | 'pickup' | 'dine_in';
type Step = 1 | 2 | 3;

const STEP_LABELS = ['Mis datos', 'Entrega', 'Pago'];

function CheckoutContent({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const previewParam = isPreview ? '?preview=true' : '';

  const { items, getSubtotal, getTotal, clearCart } = useCart();

  // Store config
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Form state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Customer Data & Receipt
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneLocked, setIsPhoneLocked] = useState(false);
  const [recognizedCustomer, setRecognizedCustomer] = useState<string | null>(null);
  const [dni, setDni] = useState('');
  const [receiptType, setReceiptType] = useState<'none' | 'boleta' | 'factura'>('none');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');

  // Step 2: Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);

  // Step 3: Payment
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [paymentMethodName, setPaymentMethodName] = useState('');

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = getSubtotal();
  const taxAmount = storeInfo?.tax_enabled ? (subtotal * (storeInfo.tax_percentage || 18) / 100) : 0;
  const activeDeliveryCost = storeInfo?.delivery_mode === 'coordinate' ? 0 : (deliveryCost || storeInfo?.delivery_cost || 0);
  const total = (deliveryMethod === 'delivery' ? activeDeliveryCost : 0) + subtotal + taxAmount;

  // Load store info & Auto-recognize WhatsApp phone from URL query or localStorage
  useEffect(() => {
    if (items.length === 0) {
      router.replace(`/${params.slug}${previewParam}`);
      return;
    }

    // Load store info
    fetch(`${API}/api/v1/store/${params.slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setStoreInfo(d.data);
          setPaymentMethods(d.data.payment_methods || []);
          if (d.data.payment_methods?.length > 0) {
            setPaymentMethodId(d.data.payment_methods[0].id);
            setPaymentMethodName(d.data.payment_methods[0].name);
          }
          if (!d.data.delivery_enabled && d.data.pickup_enabled) {
            setDeliveryMethod('pickup');
          }
        }
      })
      .catch(() => {});

    // Check Phone from URL params or localStorage
    const urlPhone = searchParams.get('phone') || searchParams.get('wa') || searchParams.get('tel');
    const savedPhone = urlPhone || localStorage.getItem(`chatya_phone_${params.slug}`);
    const savedName = localStorage.getItem(`chatya_name_${params.slug}`);

    if (savedPhone) {
      const clean = savedPhone.replace(/\D/g, '');
      setPhone(clean);
      setIsPhoneLocked(true);

      if (savedName) {
        setName(savedName);
        setRecognizedCustomer(savedName);
      }

      // Lookup backend for returning customer
      fetch(`${API}/api/v1/store/${params.slug}/customer-lookup?phone=${clean}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.exists && data.full_name) {
            setName(data.full_name);
            setRecognizedCustomer(data.full_name);
            localStorage.setItem(`chatya_name_${params.slug}`, data.full_name);
          }
        })
        .catch(() => {});
    }
  }, [params.slug, items.length, searchParams, router, previewParam]);

  // Live lookup by phone number if typing manually
  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 8) {
      try {
        const res = await fetch(`${API}/api/v1/store/${params.slug}/customer-lookup?phone=${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.full_name) {
            setName(data.full_name);
            setRecognizedCustomer(data.full_name);
          }
        }
      } catch (e) {}
    }
  };

  // Obtain GPS Geolocation
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingLocation(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        setGpsCoordinates(`${lat}, ${lng}`);
        setReference((prev) => (prev ? `${prev} | 📍 GPS: ${mapsLink}` : `📍 Ubicación GPS: ${mapsLink}`));
      },
      (err) => {
        setGettingLocation(false);
        alert('No se pudo obtener la ubicación GPS. Por favor escribe tu dirección manualmente o activa los permisos de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const goStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'CLIENTES VARIOS';
    const finalPhone = phone.trim() || '00000000000';

    if (finalName !== 'CLIENTES VARIOS') {
      localStorage.setItem(`chatya_name_${params.slug}`, finalName);
    }
    if (finalPhone !== '00000000000') {
      localStorage.setItem(`chatya_phone_${params.slug}`, finalPhone);
    }

    setStep(2);
  };

  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (deliveryMethod === 'delivery' && !address.trim()) {
      setError('Por favor ingresa la dirección de entrega');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const finalCustomerName = name.trim() || (recognizedCustomer || 'CLIENTES VARIOS');
      const finalPhone = phone.trim() || '00000000000';

      const orderPayload: any = {
        customer_name: finalCustomerName,
        whatsapp_number: finalPhone,
        delivery_method: deliveryMethod,
        payment_method: paymentMethodName || 'Efectivo contra entrega',
        receipt_type: receiptType,
        delivery_cost: activeDeliveryCost,
        items: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          product_sku: i.product.sku || null,
          quantity: i.quantity,
          unit_price: Number(i.product.price),
          discount_amount: 0.0,
          total_price: Number((i.product.price * i.quantity).toFixed(2)),
        })),
        notes: notes || null,
      };

      if (deliveryMethod === 'delivery') {
        orderPayload.delivery_address = address;
        orderPayload.delivery_reference = reference || null;
        orderPayload.delivery_district = district || null;
      }

      if (receiptType === 'boleta') {
        orderPayload.receipt_data = { document_number: dni, full_name: finalCustomerName };
      } else if (receiptType === 'factura') {
        orderPayload.receipt_data = { ruc: ruc, business_name: razonSocial };
      }

      const res = await fetch(`${API}/api/v1/store/${params.slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let errorDetail = 'Error al crear el pedido';
        if (typeof err.detail === 'string') {
          errorDetail = err.detail;
        } else if (Array.isArray(err.detail)) {
          errorDetail = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
        throw new Error(errorDetail);
      }

      const data = await res.json();
      const order = data.data || data;

      clearCart();
      router.push(
        `/${params.slug}/confirmacion?` +
        `order_code=${encodeURIComponent(order.order_code || 'PED-000001')}` +
        `&tracking=${encodeURIComponent(order.tracking_token || '')}` +
        `&wa_url=${encodeURIComponent(order.whatsapp_url || '')}` +
        `&name=${encodeURIComponent(finalCustomerName)}` +
        (isPreview ? '&preview=true' : '')
      );
    } catch (err: any) {
      setError(err.message || 'Error de conexión. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  const StepDot = ({ n }: { n: number }) => (
    <div className="flex items-center gap-2 flex-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
        step > n ? 'bg-emerald-600 text-white' :
        step === n ? 'bg-slate-900 text-white ring-4 ring-slate-100' :
        'bg-gray-100 text-gray-400'
      }`}>
        {step > n ? <Check className="w-3.5 h-3.5" /> : n}
      </div>
      <span className={`text-xs font-bold ${step >= n ? 'text-slate-900' : 'text-gray-400'}`}>
        {STEP_LABELS[n - 1]}
      </span>
      {n < 3 && <div className={`flex-1 h-0.5 rounded-full ${step > n ? 'bg-emerald-500' : 'bg-gray-100'}`} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-36 font-sans">
      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">Modo vista previa — Pedido de prueba</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => step === 1 ? router.back() : setStep((step - 1) as Step)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-900 text-sm">Finalizar Pedido</h1>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 shadow-sm">
        <div className="flex items-center gap-1 max-w-lg mx-auto">
          <StepDot n={1} /><StepDot n={2} /><StepDot n={3} />
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* ===== STEP 1: Customer Data ===== */}
        {step === 1 && (
          <motion.form
            onSubmit={goStep1}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Recognized Customer Welcome */}
            {recognizedCustomer && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-emerald-900">¡Hola de nuevo, {recognizedCustomer}!</p>
                  <p className="text-xs text-emerald-700">Reconocimos tu WhatsApp y cargamos tus datos automáticamente.</p>
                </div>
              </div>
            )}

            <div className="card p-5 space-y-4 border border-gray-200 shadow-sm rounded-3xl">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-slate-900" /> Tus datos de contacto
              </h2>

              {/* WhatsApp Number (Locked if recognized, with toggle) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="input-label font-bold text-slate-900 mb-0">
                    Número de WhatsApp
                  </label>
                  {isPhoneLocked && (
                    <button
                      type="button"
                      onClick={() => setIsPhoneLocked(false)}
                      className="text-[11px] text-slate-600 hover:text-slate-900 font-bold underline"
                    >
                      Editar número
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    readOnly={isPhoneLocked}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={`input pl-9 font-bold ${
                      isPhoneLocked
                        ? 'bg-slate-100 text-slate-800 border-slate-300 cursor-not-allowed'
                        : 'bg-white'
                    }`}
                    placeholder="ej. 51924081476"
                    autoComplete="tel"
                  />
                  {isPhoneLocked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      <Lock className="w-3 h-3" /> Verificado
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {isPhoneLocked
                    ? 'Tu número fue identificado desde WhatsApp para confirmar tu pedido.'
                    : 'Ingresa tu número con código de país (ej. 51924081476 para Perú).'}
                </p>
              </div>

              {/* Customer Name */}
              <div>
                <label className="input-label font-bold text-slate-900">
                  Nombre completo <span className="text-gray-400 font-normal">(para identificarte)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input font-semibold"
                  placeholder="¿Cómo te llamas?"
                  autoComplete="name"
                />
              </div>

              {/* Comprobante de Pago Section — Only show enabled options */}
              {(storeInfo?.receipt_boleta || storeInfo?.receipt_factura) && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <label className="input-label font-bold text-slate-900">Tipo de Comprobante de Pago</label>
                  <div className="flex flex-wrap gap-2">
                    {storeInfo?.receipt_none !== false && (
                      <button
                        type="button"
                        onClick={() => setReceiptType('none')}
                        className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold border text-center transition-all ${
                          receiptType === 'none'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Sin comprobante
                      </button>
                    )}
                    {storeInfo?.receipt_boleta && (
                      <button
                        type="button"
                        onClick={() => setReceiptType('boleta')}
                        className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold border text-center transition-all ${
                          receiptType === 'boleta'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Boleta
                      </button>
                    )}
                    {storeInfo?.receipt_factura && (
                      <button
                        type="button"
                        onClick={() => setReceiptType('factura')}
                        className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold border text-center transition-all ${
                          receiptType === 'factura'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Factura
                      </button>
                    )}
                  </div>

                  {receiptType === 'boleta' && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <label className="input-label text-xs font-bold text-slate-900">DNI del Cliente (8 dígitos)</label>
                      <input
                        type="text"
                        maxLength={8}
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="input bg-white text-xs font-bold font-mono"
                        placeholder="ej. 76543210"
                        inputMode="numeric"
                      />
                    </div>
                  )}

                  {receiptType === 'factura' && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div>
                        <label className="input-label text-xs font-bold text-slate-900">RUC de la Empresa (11 dígitos) *</label>
                        <input
                          type="text"
                          required
                          maxLength={11}
                          value={ruc}
                          onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          className="input bg-white text-xs font-bold font-mono"
                          placeholder="ej. 20123456789"
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="input-label text-xs font-bold text-slate-900">Razón Social *</label>
                        <input
                          type="text"
                          required
                          value={razonSocial}
                          onChange={(e) => setRazonSocial(e.target.value)}
                          className="input bg-white text-xs font-semibold uppercase"
                          placeholder="ej. EMPRESA COMERCIAL S.A.C."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bottom-bar bg-white border-t border-gray-100 px-4 py-3">
              <button type="submit" className="btn-dark w-full py-4 rounded-2xl font-bold text-sm shadow-md">
                Continuar a Entrega <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </motion.form>
        )}

        {/* ===== STEP 2: Delivery ===== */}
        {step === 2 && (
          <motion.form
            onSubmit={goStep2}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="card p-5 space-y-4 border border-gray-200 shadow-sm rounded-3xl">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-900" /> Método de entrega
              </h2>

              <div className="grid grid-cols-1 gap-2.5">
                {storeInfo?.delivery_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      deliveryMethod === 'delivery'
                        ? 'border-slate-900 bg-slate-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-slate-800" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Delivery a domicilio</p>
                          <p className="text-xs font-medium text-slate-600">
                            {storeInfo?.delivery_mode === 'coordinate'
                              ? 'Se coordinará y evaluará por WhatsApp'
                              : district && activeDeliveryCost > 0
                              ? `Costo de envío: S/ ${activeDeliveryCost.toFixed(2)} (${district})`
                              : storeInfo?.delivery_cost > 0
                              ? `Costo de envío: S/ ${Number(storeInfo.delivery_cost).toFixed(2)}`
                              : 'Selecciona tu distrito abajo para calcular el costo'}
                          </p>
                        </div>
                      </div>
                      {deliveryMethod === 'delivery' && <Check className="w-5 h-5 text-slate-900" />}
                    </div>
                  </button>
                )}

                {storeInfo?.pickup_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      deliveryMethod === 'pickup'
                        ? 'border-slate-900 bg-slate-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-slate-800" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Recojo en tienda</p>
                          <p className="text-xs text-gray-500">Sin costo de envío — Recoge en nuestro local</p>
                        </div>
                      </div>
                      {deliveryMethod === 'pickup' && <Check className="w-5 h-5 text-slate-900" />}
                    </div>
                  </button>
                )}
              </div>

              {/* Address and Maps fields for delivery */}
              <AnimatePresence>
                {deliveryMethod === 'delivery' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-3 pt-2 border-t border-gray-100"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="input-label font-bold text-slate-900 mb-0">
                          Dirección de entrega *
                        </label>

                        {/* GPS Location Button */}
                        <button
                          type="button"
                          onClick={handleGetGpsLocation}
                          disabled={gettingLocation}
                          className="text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {gettingLocation ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Obteniendo GPS...
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3.5 h-3.5 text-blue-600" /> Ubicación GPS
                            </>
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          className="input pl-9 font-medium"
                          placeholder="Av. Principal 123, Dpto 4..."
                        />
                      </div>
                    </div>

                    {/* District Selector */}
                    <div>
                      <label className="input-label font-bold text-slate-900">Distrito de entrega *</label>
                      {Array.isArray(storeInfo?.covered_districts) && storeInfo.covered_districts.length > 0 ? (
                        <select
                          value={district}
                          onChange={(e) => {
                            const selectedName = e.target.value;
                            setDistrict(selectedName);
                            const found = storeInfo.covered_districts.find((d: any) => d.name === selectedName);
                            if (found) {
                              setDeliveryCost(found.cost);
                            }
                          }}
                          required
                          className="input font-semibold"
                        >
                          <option value="">-- Seleccionar tu Distrito --</option>
                          {storeInfo.covered_districts.map((d: any, idx: number) => (
                            <option key={idx} value={d.name}>
                              {d.name} (Delivery S/ {Number(d.cost).toFixed(2)})
                            </option>
                          ))}
                          <option value="otro">Otro distrito no listado...</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          required
                          className="input"
                          placeholder="ej. Miraflores, San Isidro, Surco, Comas..."
                        />
                      )}

                      {district === 'otro' && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                          💡 El costo para ese distrito se coordinará y confirmará directamente por WhatsApp.
                        </div>
                      )}
                    </div>

                    {/* Reference & GPS link */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="input-label font-bold text-slate-900 mb-0">Referencia de ubicación</label>
                        <a
                          href="https://maps.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold"
                        >
                          Abrir Google Maps <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="input text-xs"
                        placeholder="Frente al parque, casa blanca de dos pisos, link de Google Maps..."
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes */}
              <div>
                <label className="input-label font-bold text-slate-900">
                  Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input resize-none text-xs"
                  rows={2}
                  placeholder="Llegar antes de las 8pm, tocar timbre..."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="bottom-bar bg-white border-t border-gray-100 px-4 py-3">
              <button type="submit" className="btn-dark w-full py-4 rounded-2xl font-bold text-sm shadow-md">
                Continuar a Forma de Pago <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </motion.form>
        )}

        {/* ===== STEP 3: Payment + Order Summary ===== */}
        {step === 3 && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Payment Methods */}
            <div className="card p-5 space-y-3 border border-gray-200 shadow-sm rounded-3xl">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-900" /> Forma de pago
              </h2>
              <div className="space-y-2">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethodId(pm.id);
                        setPaymentMethodName(pm.name);
                      }}
                      className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all ${
                        paymentMethodId === pm.id
                          ? 'border-slate-900 bg-slate-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{pm.name}</p>
                          {pm.instructions && (
                            <p className="text-xs text-gray-500 mt-0.5">{pm.instructions}</p>
                          )}
                        </div>
                        {paymentMethodId === pm.id && <Check className="w-4 h-4 text-slate-900" />}
                      </div>
                    </button>
                  ))
                ) : (
                  ['Yape / Plin', 'Efectivo contra entrega'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPaymentMethodId(0);
                        setPaymentMethodName(m);
                      }}
                      className={`w-full p-3.5 rounded-2xl border-2 text-left ${
                        paymentMethodName === m ? 'border-slate-900 bg-slate-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="font-bold text-sm text-slate-900">{m}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="card p-5 space-y-3 border border-gray-200 shadow-sm rounded-3xl">
              <h2 className="font-bold text-slate-900 text-sm">Resumen del pedido</h2>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span className="text-slate-700">
                      <strong className="text-slate-900">{item.quantity}×</strong> {item.product.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      S/ {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Subtotal</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>

                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-800 font-bold">
                    <span>IGV ({storeInfo?.tax_percentage || 18}%)</span>
                    <span>S/ {taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {deliveryMethod === 'delivery' && (
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Delivery</span>
                    <span>{activeDeliveryCost > 0 ? `S/ ${activeDeliveryCost.toFixed(2)}` : 'A coordinar'}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-base pt-2 border-t border-gray-100 text-slate-900">
                  <span>Total</span>
                  <span className="text-emerald-700">S/ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer recap — Clean without "Comprobante: none" */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600 border border-slate-200">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 flex-shrink-0 text-slate-800" />
                  <span>
                    Cliente: <strong className="text-slate-900">{name || 'CLIENTES VARIOS'}</strong>
                  </span>
                </div>

                {/* Only show comprobante line if boleta or factura is selected */}
                {receiptType !== 'none' && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-slate-800" />
                    <span>
                      Comprobante: <strong className="text-slate-900 uppercase">{receiptType}</strong>
                      {receiptType === 'factura' && ` (RUC: ${ruc} - ${razonSocial})`}
                      {receiptType === 'boleta' && (dni ? ` (DNI: ${dni})` : '')}
                    </span>
                  </div>
                )}

                {phone && phone !== '00000000000' && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-800" />
                    <span>
                      WhatsApp: <strong className="text-slate-900">+{phone.replace(/\D/g, '')}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="bottom-bar bg-white border-t border-gray-100 px-4 py-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-dark w-full py-4 rounded-2xl font-black text-sm shadow-lg disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirmando pedido...
                  </>
                ) : (
                  '✓ Confirmar y Enviar Pedido por WhatsApp'
                )}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
        </div>
      }
    >
      <CheckoutContent params={params} />
    </Suspense>
  );
}
