'use client';
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/formatters';
import {
  ShoppingBag, Search, Loader2, Phone, ChevronLeft,
  ChevronRight, Clock, Truck, CheckCircle, XCircle, CreditCard,
  Package, RefreshCw, Edit2, Copy, Send, AlertTriangle, X, Check, Plus, Trash2,
  FileText, Printer, ShieldCheck, MapPin, ExternalLink, Filter, Calendar, AlertOctagon, Lock,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('chatya_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function getGoogleMapsUrl(address?: string, district?: string, reference?: string) {
  if (reference && reference.includes('https://maps.google.com/?q=')) {
    const match = reference.match(/https:\/\/maps\.google\.com\/\?q=[^\s|]+/);
    if (match) return match[0];
  }
  const query = [address, district, 'Lima, Perú'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function generateCustomerStatusWaUrl(order: any, newStatus: string, companyName: string = 'Mi Tienda') {
  const cleanPhone = (order.whatsapp_number || '').replace(/\D/g, '');
  const trackingUrl = `http://localhost:3000/seguimiento/${order.tracking_token || ''}`;
  const statusEmojis: Record<string, string> = {
    'Pendiente': '🕐',
    'Recibido': '✅',
    'Preparando': '👨‍🍳',
    'En camino': '🚚',
    'Entregado': '🎉',
    'Pagado': '💳',
    'Anulado': '❌'
  };
  const emoji = statusEmojis[newStatus] || '📋';
  
  const msg = `¡Hola ${order.customer_name}! 👋\n\nTe informamos que tu pedido *${order.order_code}* en *${companyName}* ha sido actualizado:\n\n${emoji} *Nuevo Estado:* ${newStatus}\n💰 *Monto Total:* S/ ${Number(order.total || 0).toFixed(2)}\n\n🔍 *Sigue tu pedido en tiempo real aquí:*\n${trackingUrl}\n\n¡Muchas gracias! 🙌`;
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

function generateCustomerModifiedOrderWaUrl(order: any, companyName: string = 'Mi Tienda') {
  const cleanPhone = (order.whatsapp_number || '').replace(/\D/g, '');
  const trackingUrl = `http://localhost:3000/seguimiento/${order.tracking_token || ''}`;
  const itemsSummary = (order.items || []).map((i: any) => `  • ${i.quantity}x ${i.product_name} = S/ ${Number(i.total_price || (i.unit_price * i.quantity)).toFixed(2)}`).join('\n');
  
  const msg = `¡Hola ${order.customer_name}! 👋\n\nTu pedido *${order.order_code}* en *${companyName}* ha sido modificado y actualizado:\n\n🛍️ *Productos:*\n${itemsSummary}\n\n🚚 *Envío:* S/ ${Number(order.delivery_cost || 0).toFixed(2)}\n💳 *NUEVO TOTAL:* S/ ${Number(order.total || 0).toFixed(2)}\n\n🔍 *Puedes ver tu pedido actualizado en vivo aquí:*\n${trackingUrl}\n\n¡Gracias! 🙌`;
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

const STATUS_PIPELINE = [
  { key: 'Pendiente', label: 'Pendiente', icon: Clock, badge: 'badge-yellow', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
  { key: 'Recibido', label: 'Recibido', icon: CheckCircle, badge: 'badge-blue', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'Preparando', label: 'Preparando', icon: Package, badge: 'badge-yellow', bg: 'bg-orange-50 border-orange-200 text-orange-800' },
  { key: 'En camino', label: 'En camino', icon: Truck, badge: 'badge-blue', bg: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { key: 'Entregado', label: 'Entregado', icon: CheckCircle, badge: 'badge-green', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { key: 'Pagado', label: 'Pagado', icon: CreditCard, badge: 'badge-violet', bg: 'bg-purple-50 border-purple-200 text-purple-800' },
  { key: 'Anulado', label: 'Anulado', icon: XCircle, badge: 'badge-red', bg: 'bg-red-50 border-red-200 text-red-800' },
];

const DELIVERY_LABELS: Record<string, string> = {
  delivery: '🚚 Delivery',
  pickup: '🏪 Recojo en tienda',
  dine_in: '🍽️ Consumo en local',
};

export default function OrdersPage() {
  // Main view tab
  const [activeTab, setActiveTab] = useState<'pedidos' | 'comprobantes'>('pedidos');

  const [orders, setOrders] = useState<any[]>([]);
  const [lastNotification, setLastNotification] = useState<{ url: string; orderCode: string; message: string } | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [companySlug, setCompanySlug] = useState('demo');

  // Cancel Order Modal state
  const [cancelOrderObj, setCancelOrderObj] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Edit Modal state
  const [editOrderObj, setEditOrderObj] = useState<any | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Invoice Modal state
  const [invoiceModalObj, setInvoiceModalObj] = useState<any | null>(null);
  const [invoiceType, setInvoiceType] = useState<'factura' | 'boleta'>('factura');
  const [invoiceSeries, setInvoiceSeries] = useState('');
  const [clientRuc, setClientRuc] = useState('');
  const [clientRazonSocial, setClientRazonSocial] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [invoiceFormError, setInvoiceFormError] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Annul Invoice Modal state
  const [annulInvoiceObj, setAnnulInvoiceObj] = useState<any | null>(null);
  const [submittingAnnulInvoice, setSubmittingAnnulInvoice] = useState(false);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Orders tab filters (Default to TODAY)
  const [orderDateFrom, setOrderDateFrom] = useState(getTodayString);
  const [orderDateTo, setOrderDateTo] = useState(getTodayString);

  // Comprobantes tab filters (Default to TODAY)
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | 'factura' | 'boleta'>('all');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState(getTodayString);
  const [invoiceDateTo, setInvoiceDateTo] = useState(getTodayString);

  // Quick preset helper
  const setQuickDates = (range: 'today' | '7days' | 'month' | 'all', target: 'pedidos' | 'comprobantes') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let fromStr = '';
    let toStr = todayStr;

    if (range === 'today') {
      fromStr = todayStr;
    } else if (range === '7days') {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      fromStr = d7.toISOString().split('T')[0];
    } else if (range === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      fromStr = firstDay.toISOString().split('T')[0];
    } else if (range === 'all') {
      fromStr = '';
      toStr = '';
    }

    if (target === 'pedidos') {
      setOrderDateFrom(fromStr);
      setOrderDateTo(toStr);
    } else {
      setInvoiceDateFrom(fromStr);
      setInvoiceDateTo(toStr);
    }
  };

  // Feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const limit = 50;

  useEffect(() => {
    const slug = localStorage.getItem('chatya_company_slug') || 'demo';
    setCompanySlug(slug);
    fetchProducts();
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, orderDateFrom, orderDateTo]);

  const handleUnauthorized = () => {
    localStorage.removeItem('chatya_token');
    window.location.href = '/admin/login?expired=true';
  };

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch(`${API}/api/v1/config/company`, { headers: authHeader() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        if (d?.data) setCompanyInfo(d.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/api/v1/products/`, { headers: authHeader() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProductsList(Array.isArray(data) ? data : data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (orderDateFrom) params.set('date_from', orderDateFrom);
      if (orderDateTo) params.set('date_to', orderDateTo);

      const res = await fetch(`${API}/api/v1/orders/?${params}`, { headers: authHeader() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string, reason: string = '') => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ status: newStatus, cancel_reason: reason }),
      });
      if (res.ok) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const waUrl = generateCustomerStatusWaUrl(order, newStatus, companyInfo?.company?.name || companyInfo?.name || 'Mi Tienda');
          setLastNotification({
            url: waUrl,
            orderCode: order.order_code,
            message: `Estado actualizado a "${newStatus}". Haz clic para notificar al cliente por WhatsApp.`
          });
        }
        setActionSuccess(`Estado de ${order?.order_code || 'pedido'} actualizado a "${newStatus}" ✓`);
        setTimeout(() => setActionSuccess(''), 5000);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderObj) return;
    setSubmittingCancel(true);
    await updateStatus(cancelOrderObj.id, 'Anulado', cancelReason);
    setSubmittingCancel(false);
    setCancelOrderObj(null);
    setCancelReason('');
  };

  const getNextInvoiceSeries = (type: 'boleta' | 'factura', existingOrder?: any) => {
    if (existingOrder?.invoice_number) return existingOrder.invoice_number;
    const prefix = type === 'factura' ? 'F001' : 'B001';
    const typeInvoices = orders.filter(o => o.invoice_number?.startsWith(prefix));
    let maxNum = 0;
    typeInvoices.forEach(o => {
      const parts = o.invoice_number.split('-');
      if (parts.length === 2) {
        const n = parseInt(parts[1]);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    return `${prefix}-${(maxNum + 1).toString().padStart(6, '0')}`;
  };

  // Open Invoice Modal (for issuance or viewing)
  const openInvoiceModal = (order: any) => {
    setInvoiceModalObj(order);
    setInvoiceFormError('');
    const type = order.receipt_type === 'factura' || (order.invoice_number && order.invoice_number.startsWith('F')) ? 'factura' : 'boleta';
    setInvoiceType(type);
    setInvoiceSeries(order.invoice_number || getNextInvoiceSeries(type, order));

    let rucVal = '';
    let razonVal = '';
    let dniVal = order.customer_dni || '';

    if (order.receipt_data) {
      try {
        const parsed = typeof order.receipt_data === 'string' ? JSON.parse(order.receipt_data) : order.receipt_data;
        if (parsed.ruc) rucVal = parsed.ruc;
        if (parsed.razon_social) razonVal = parsed.razon_social;
        if (parsed.dni) dniVal = parsed.dni;
      } catch (e) {}
    }

    setClientRuc(rucVal);
    setClientRazonSocial(razonVal);
    setClientDni(dniVal);
  };

  // Save new invoice
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModalObj) return;
    setInvoiceFormError('');

    // Strict validation for Factura vs Boleta
    if (invoiceType === 'factura') {
      const cleanRuc = clientRuc.trim().replace(/\D/g, '');
      if (cleanRuc.length !== 11) {
        setInvoiceFormError('⚠️ La Factura Electrónica requiere obligatoriamente un RUC válido de 11 dígitos.');
        return;
      }
      if (!clientRazonSocial.trim()) {
        setInvoiceFormError('⚠️ La Factura Electrónica requiere obligatoriamente la Razón Social de la empresa.');
        return;
      }
    }

    // For Boleta: if DNI is empty, auto-assign default client (CLIENTES VARIOS / 00000000)
    let finalDni = clientDni.trim().replace(/\D/g, '');
    let finalCustomerName = invoiceModalObj.customer_name;
    if (invoiceType === 'boleta' && !finalDni) {
      finalDni = '00000000';
      if (!finalCustomerName || finalCustomerName.trim() === '') {
        finalCustomerName = 'CLIENTES VARIOS';
      }
    }

    setSubmittingInvoice(true);

    const receiptDataObj = invoiceType === 'factura'
      ? { ruc: clientRuc.trim(), razon_social: clientRazonSocial.trim() }
      : { dni: finalDni };

    try {
      const res = await fetch(`${API}/api/v1/orders/${invoiceModalObj.id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          receipt_type: invoiceType,
          receipt_data: JSON.stringify(receiptDataObj),
          invoice_number: invoiceSeries.trim(),
        }),
      });

      if (res.ok) {
        setActionSuccess(`Comprobante ${invoiceSeries} emitido y registrado exitosamente ✓`);
        setTimeout(() => setActionSuccess(''), 5000);
        fetchOrders();
        setInvoiceModalObj(null);
      }
    } catch (e) {
      console.error(e);
      setInvoiceFormError('Error al guardar comprobante. Verifica la conexión con el servidor.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Annul invoice and release order
  const handleAnnulInvoiceConfirm = async () => {
    if (!annulInvoiceObj) return;
    setSubmittingAnnulInvoice(true);

    try {
      const res = await fetch(`${API}/api/v1/orders/${annulInvoiceObj.id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          invoice_number: null,
        }),
      });

      if (res.ok) {
        setActionSuccess(`Comprobante ${annulInvoiceObj.invoice_number} anulado exitosamente. El pedido #${annulInvoiceObj.order_code} ha sido liberado ✓`);
        setTimeout(() => setActionSuccess(''), 5000);
        fetchOrders();
        setAnnulInvoiceObj(null);
        if (invoiceModalObj?.id === annulInvoiceObj.id) {
          setInvoiceModalObj(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAnnulInvoice(false);
    }
  };

  // Printable HTML Invoice Generator
  const printInvoicePDF = (order: any) => {
    const isFactura = (order.receipt_type === 'factura') || (order.invoice_number && order.invoice_number.startsWith('F'));
    const compName = companyInfo?.company?.name || companyInfo?.name || 'MusicSap';
    const compRuc = companyInfo?.company?.ruc || companyInfo?.ruc || '20601234567';
    const compAddress = companyInfo?.company?.address || companyInfo?.address || 'Av. Comercial 123, Lima';
    const compPhone = companyInfo?.company?.phone_whatsapp || companyInfo?.phone_whatsapp || '';

    const taxPercentage = companyInfo?.config?.tax_percentage ?? 18;
    const pricesIncludeTax = companyInfo?.config?.prices_include_tax ?? true;
    const delivery = Number(order.delivery_cost || 0);
    const rawTotal = Number(order.total || 0);

    let subtotal: number;
    let tax: number;
    let total: number;

    if (pricesIncludeTax) {
      const itemsTotal = Math.max(0, rawTotal - delivery);
      subtotal = itemsTotal / (1 + taxPercentage / 100);
      tax = itemsTotal - subtotal;
      total = rawTotal;
    } else {
      subtotal = Number(order.subtotal || (rawTotal - delivery));
      tax = subtotal * (taxPercentage / 100);
      total = subtotal + tax + delivery;
    }

    let parsedReceipt: any = {};
    if (order.receipt_data) {
      try {
        parsedReceipt = typeof order.receipt_data === 'string' ? JSON.parse(order.receipt_data) : order.receipt_data;
      } catch (e) {}
    }

    const clientDisplayRuc = clientRuc || parsedReceipt.ruc || '';
    const clientDisplayRazon = clientRazonSocial || parsedReceipt.razon_social || order.customer_name;
    const clientDisplayDni = clientDni || parsedReceipt.dni || '00000000';

    const currentSeries = order.invoice_number || invoiceSeries;

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante ${currentSeries} - ${compName}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; max-width: 720px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; gap: 20px; }
          .title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
          .subtitle { font-size: 12px; color: #475569; margin-top: 2px; }
          .invoice-box { border: 2px solid #0f172a; padding: 12px 24px; text-align: center; border-radius: 12px; background: #f8fafc; min-width: 220px; }
          .invoice-box h2 { margin: 0; font-size: 15px; font-weight: 900; }
          .invoice-box h3 { margin: 6px 0 0 0; font-size: 18px; color: #0f172a; font-family: monospace; font-weight: bold; }
          .client-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #0f172a; color: white; text-align: left; padding: 9px 12px; font-size: 12px; }
          td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
          .totals { width: 280px; margin-left: auto; font-size: 13px; border-top: 2px solid #0f172a; padding-top: 8px; }
          .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals .grand-total { font-weight: 900; font-size: 16px; border-top: 1px solid #0f172a; padding-top: 8px; margin-top: 4px; color: #0f172a; }
          .footer { text-align: center; margin-top: 35px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div className="header">
          <div>
            <div className="title">${compName}</div>
            <div className="subtitle"><strong>RUC:</strong> ${compRuc}</div>
            <div className="subtitle"><strong>Dirección:</strong> ${compAddress}</div>
            ${compPhone ? `<div className="subtitle"><strong>Teléfono:</strong> ${compPhone}</div>` : ''}
          </div>
          <div className="invoice-box">
            <h2>${isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}</h2>
            <h3>${currentSeries}</h3>
          </div>
        </div>

        <div className="client-box">
          <strong>INFORMACIÓN DEL CLIENTE:</strong><br/>
          ${isFactura ? `<strong>Razón Social:</strong> ${clientDisplayRazon}<br/><strong>RUC:</strong> ${clientDisplayRuc}<br/>` : `<strong>Cliente:</strong> ${order.customer_name || 'CLIENTES VARIOS'}<br/><strong>DNI:</strong> ${clientDisplayDni}<br/>`}
          <strong>Fecha de Emisión:</strong> ${order.created_at ? formatDateTime(order.created_at) : new Date().toLocaleDateString('es-PE')}<br/>
          <strong>Forma de Pago:</strong> ${order.payment_method || 'Contado'}<br/>
          <strong>Dirección de Entrega:</strong> ${order.delivery_address || 'Venta en local'} ${order.delivery_district ? `(${order.delivery_district})` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">Cant.</th>
              <th>Descripción del Producto</th>
              <th style="text-align:right; width: 110px;">P. Unitario</th>
              <th style="text-align:right; width: 110px;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((i: any) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${i.quantity}</td>
                <td>${i.product_name}</td>
                <td style="text-align:right">S/ ${Number(i.unit_price).toFixed(2)}</td>
                <td style="text-align:right; font-weight: bold;">S/ ${Number(i.total_price || (i.unit_price * i.quantity)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div className="totals">
          <div><span>Subtotal (Op. Gravada):</span> <span>S/ ${subtotal.toFixed(2)}</span></div>
          <div><span>IGV (${taxPercentage}%):</span> <span>S/ ${tax.toFixed(2)}</span></div>
          ${delivery > 0 ? `<div><span>Costo de Envío:</span> <span>S/ ${delivery.toFixed(2)}</span></div>` : ''}
          <div className="grand-total"><span>TOTAL:</span> <span>S/ ${total.toFixed(2)}</span></div>
        </div>

        <div className="footer">
          <p>Representación Impresa del Comprobante Electrónico según normativa vigente de SUNAT. ¡Muchas gracias por su preferencia!</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // WhatsApp invoice notification
  const sendInvoiceWhatsApp = (order: any) => {
    const isFactura = (order.receipt_type === 'factura') || (order.invoice_number && order.invoice_number.startsWith('F'));
    const compName = companyInfo?.company?.name || companyInfo?.name || 'MusicSap';
    const taxPercentage = companyInfo?.config?.tax_percentage ?? 18;
    const rawTotal = Number(order.total || 0);
    const delivery = Number(order.delivery_cost || 0);
    const itemsTotal = Math.max(0, rawTotal - delivery);
    const subtotal = itemsTotal / (1 + taxPercentage / 100);
    const tax = itemsTotal - subtotal;

    let parsedReceipt: any = {};
    if (order.receipt_data) {
      try {
        parsedReceipt = typeof order.receipt_data === 'string' ? JSON.parse(order.receipt_data) : order.receipt_data;
      } catch (e) {}
    }

    const currentSeries = order.invoice_number || invoiceSeries;

    const text =
      `📄 *COMPROBANTE EMITIDO — ${currentSeries}*\n` +
      `🏢 *Empresa:* ${compName}\n\n` +
      `👤 *Receptor:* ${isFactura ? (clientRazonSocial || parsedReceipt.razon_social || order.customer_name) : (order.customer_name || 'CLIENTES VARIOS')}\n` +
      (isFactura ? `🔢 *RUC:* ${clientRuc || parsedReceipt.ruc}\n` : `🔢 *DNI:* ${clientDni || parsedReceipt.dni || '00000000'}\n`) +
      `\n🛍️ *Detalle del comprobante:*\n` +
      (order.items || []).map((i: any) => `• ${i.quantity}x ${i.product_name} = S/ ${Number(i.total_price || (i.unit_price * i.quantity)).toFixed(2)}`).join('\n') +
      `\n\n💰 *Op. Gravada (Subtotal):* S/ ${subtotal.toFixed(2)}\n` +
      `🧾 *IGV (${taxPercentage}%):* S/ ${tax.toFixed(2)}\n` +
      (delivery > 0 ? `🚚 *Envío:* S/ ${delivery.toFixed(2)}\n` : '') +
      `💳 *TOTAL FACTURADO:* S/ ${rawTotal.toFixed(2)}\n\n` +
      `✅ ¡Gracias por tu compra! Tu comprobante ${currentSeries} fue emitido correctamente.`;

    const num = (order.whatsapp_number || '').replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Generate formatted WhatsApp message text
  const generateWAMessage = (order: any) => {
    const itemsText = (order.items || [])
      .map((i: any) => `• ${i.quantity}x ${i.product_name} (S/ ${Number(i.unit_price).toFixed(2)}) = S/ ${Number(i.total_price).toFixed(2)}`)
      .join('\n');

    return (
      `🛒 *PEDIDO ${order.order_code}*\n` +
      `👤 *Cliente:* ${order.customer_name}\n` +
      `📱 *Teléfono:* ${order.whatsapp_number}\n` +
      `📋 *Estado:* ${order.status}\n\n` +
      `🛍️ *Productos:*\n${itemsText}\n\n` +
      `💰 *Subtotal:* S/ ${Number(order.subtotal || 0).toFixed(2)}\n` +
      `🚚 *Envío:* S/ ${Number(order.delivery_cost || 0).toFixed(2)}\n` +
      `💳 *TOTAL:* S/ ${Number(order.total || 0).toFixed(2)}\n\n` +
      (order.delivery_address ? `📍 *Dirección:* ${order.delivery_address} (${order.delivery_district || ''})\n` : '') +
      (order.notes ? `📝 *Notas:* ${order.notes}\n` : '') +
      `📌 *Seguimiento:* http://localhost:3000/seguimiento/${order.tracking_token || ''}`
    );
  };

  const openWhatsApp = (order: any) => {
    const text = generateWAMessage(order);
    const num = (order.whatsapp_number || '').replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyWAMessage = (order: any) => {
    const text = generateWAMessage(order);
    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Save edited order
  const handleSaveEditedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrderObj) return;
    setSubmittingEdit(true);

    try {
      const res = await fetch(`${API}/api/v1/orders/${editOrderObj.id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          customer_name: editOrderObj.customer_name,
          whatsapp_number: editOrderObj.whatsapp_number,
          delivery_address: editOrderObj.delivery_address,
          delivery_district: editOrderObj.delivery_district,
          delivery_reference: editOrderObj.delivery_reference,
          delivery_cost: editOrderObj.delivery_cost,
          notes: editOrderObj.notes,
          status: editOrderObj.status,
          items: editOrderObj.items,
        }),
      });

      if (res.ok) {
        const waUrl = generateCustomerModifiedOrderWaUrl(editOrderObj, companyInfo?.company?.name || companyInfo?.name || 'Mi Tienda');
        setLastNotification({
          url: waUrl,
          orderCode: editOrderObj.order_code,
          message: `Pedido modificado. Haz clic para enviar el nuevo resumen al cliente por WhatsApp.`
        });
        setActionSuccess(`Pedido ${editOrderObj.order_code} modificado correctamente ✓`);
        setTimeout(() => setActionSuccess(''), 5000);
        fetchOrders();
        setEditOrderObj(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const getStatusInfo = (key: string) =>
    STATUS_PIPELINE.find(s => s.key?.toLowerCase() === key?.toLowerCase()) || STATUS_PIPELINE[0];

  // Filtered orders for regular view
  const filteredOrders = orders.filter(o =>
    !search ||
    o.order_code?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.whatsapp_number?.includes(search) ||
    (o.invoice_number && o.invoice_number.toLowerCase().includes(search.toLowerCase()))
  );

  // Invoices list for Comprobantes Tab
  const invoicesList = orders.filter(o => {
    if (!o.invoice_number) return false;
    
    // Type filter
    if (invoiceTypeFilter === 'factura' && !o.invoice_number.startsWith('F')) return false;
    if (invoiceTypeFilter === 'boleta' && !o.invoice_number.startsWith('B')) return false;

    // Search filter (NumCP or Customer Name or RUC)
    if (invoiceSearch) {
      const q = invoiceSearch.toLowerCase();
      const matchSeries = o.invoice_number.toLowerCase().includes(q);
      const matchCustomer = (o.customer_name || '').toLowerCase().includes(q);
      const matchReceipt = (o.receipt_data || '').toLowerCase().includes(q);
      const matchOrder = (o.order_code || '').toLowerCase().includes(q);
      if (!matchSeries && !matchCustomer && !matchReceipt && !matchOrder) return false;
    }

    // Date range filter
    if (invoiceDateFrom && o.created_at) {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      if (orderDate < invoiceDateFrom) return false;
    }
    if (invoiceDateTo && o.created_at) {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      if (orderDate > invoiceDateTo) return false;
    }

    return true;
  });

  const totalInvoicedAmount = invoicesList.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const facturasCount = invoicesList.filter(o => o.invoice_number?.startsWith('F')).length;
  const boletasCount = invoicesList.filter(o => o.invoice_number?.startsWith('B')).length;

  const pendingCount = orders.filter(o => o.status === 'Pendiente' || o.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* WhatsApp Notification Banner */}
      {lastNotification && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-4 flex items-center justify-between shadow-md animate-fade-in flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950">
                🔔 Notificación para Pedido {lastNotification.orderCode}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                {lastNotification.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={lastNotification.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Enviar por WhatsApp
            </a>
            <button
              onClick={() => setLastNotification(null)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header & Main Views Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Ventas y Comprobantes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Control de pedidos, facturación electrónica (Boletas / Facturas) y seguimiento
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pedidos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Flujo de Pedidos</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('comprobantes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'comprobantes'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Registro de Comprobantes</span>
            <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {orders.filter(o => o.invoice_number).length}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: FLIGHT OF ORDERS ================= */}
      {activeTab === 'pedidos' && (
        <div className="space-y-4">
          {/* Status filter tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                !statusFilter ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Todos ({orders.length})
            </button>
            {STATUS_PIPELINE.map(s => {
              const count = orders.filter(o => o.status?.toLowerCase() === s.key.toLowerCase()).length;
              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === s.key ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search & Date Filter Toolbar for Orders */}
          <div className="card p-4 border border-gray-200 bg-white shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código (PED-XXXX), comprobante (F001, B001), cliente o WhatsApp..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-10 text-xs bg-white"
                />
              </div>

              {/* Date From */}
              <div className="sm:col-span-3 flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-bold whitespace-nowrap">Desde:</span>
                <input
                  type="date"
                  value={orderDateFrom}
                  onChange={e => setOrderDateFrom(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-bold whitespace-nowrap">Hasta:</span>
                <input
                  type="date"
                  value={orderDateTo}
                  onChange={e => setOrderDateTo(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>
            </div>

            {/* Quick date presets */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-500 font-bold mr-1">📅 Filtros rápidos:</span>
                <button
                  type="button"
                  onClick={() => setQuickDates('today', 'pedidos')}
                  className={`px-3 py-1 rounded-xl font-bold border transition-all ${
                    orderDateFrom === new Date().toISOString().split('T')[0] && orderDateTo === new Date().toISOString().split('T')[0]
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDates('7days', 'pedidos')}
                  className="px-3 py-1 rounded-xl font-bold border bg-white text-gray-700 border-gray-200 hover:bg-gray-100 transition-all"
                >
                  Últimos 7 días
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDates('month', 'pedidos')}
                  className="px-3 py-1 rounded-xl font-bold border bg-white text-gray-700 border-gray-200 hover:bg-gray-100 transition-all"
                >
                  Este Mes
                </button>
              </div>

              {(search || orderDateFrom || orderDateTo || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setOrderDateFrom('');
                    setOrderDateTo('');
                    setStatusFilter('');
                  }}
                  className="text-blue-600 hover:underline font-bold text-xs"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="card p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800 mx-auto" />
              <p className="text-xs text-gray-400 mt-2 font-medium">Cargando lista de pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card p-12 text-center border-2 border-dashed border-gray-200">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-bold text-base">No hay pedidos para mostrar</p>
              <p className="text-gray-400 text-xs mt-1">
                {statusFilter ? `No se encontraron pedidos con el estado "${statusFilter}"` : search ? 'Prueba con otro término de búsqueda' : 'Tus clientes podrán realizar pedidos desde el catálogo web.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                const isExpanded = expandedId === order.id;
                const hasInvoice = Boolean(order.invoice_number);

                return (
                  <div key={order.id} className="card overflow-hidden border border-gray-200 shadow-sm">
                    {/* Header Row */}
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${statusInfo.bg}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-slate-900 text-base">{order.order_code}</span>
                              <span className={`badge ${statusInfo.badge}`}>{order.status}</span>
                              {order.invoice_number && (
                                <span className="badge bg-slate-900 text-white font-mono text-[11px] flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-emerald-400" />
                                  {order.invoice_number}
                                </span>
                              )}
                              {order.delivery_method && (
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                                  {DELIVERY_LABELS[order.delivery_method] || order.delivery_method}
                                </span>
                              )}
                            </div>

                            <p className="text-sm font-bold text-gray-900 mt-1">{order.customer_name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                              <span>📱 {order.whatsapp_number}</span>
                              <span>•</span>
                              <span>{order.created_at ? formatDateTime(order.created_at) : '—'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-slate-900 text-lg">S/ {Number(order.total || 0).toFixed(2)}</p>
                          <p className="text-xs font-semibold text-gray-500">{order.payment_method || 'Efectivo'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-slate-50 p-5 space-y-5">

                        {/* Invoice Locked Notification if already invoiced */}
                        {hasInvoice && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-blue-950 font-bold">
                              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <span>Este pedido cuenta con comprobante emitido ({order.invoice_number}). La edición de productos está bloqueada.</span>
                            </div>
                            <button
                              onClick={() => setAnnulInvoiceObj(order)}
                              className="text-red-600 hover:text-red-800 font-bold underline whitespace-nowrap"
                            >
                              Anular Comprobante
                            </button>
                          </div>
                        )}

                        {/* Products list */}
                        {order.items && order.items.length > 0 && (
                          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detalle de Productos</p>
                            <div className="divide-y divide-gray-100">
                              {order.items.map((item: any, i: number) => (
                                <div key={i} className="py-2 flex items-center justify-between text-xs">
                                  <span className="text-gray-900 font-semibold">
                                    <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg mr-2">{item.quantity}×</span>
                                    {item.product_name}
                                  </span>
                                  <span className="font-bold text-slate-900">S/ {Number(item.total_price || (item.unit_price * item.quantity)).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>S/ {Number(order.subtotal || 0).toFixed(2)}</span>
                              </div>
                              {Number(order.tax_amount || 0) > 0 && (
                                <div className="flex justify-between text-slate-800 font-semibold">
                                  <span>IGV</span>
                                  <span>S/ {Number(order.tax_amount).toFixed(2)}</span>
                                </div>
                              )}
                              {Number(order.delivery_cost || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span>Delivery</span>
                                  <span>S/ {Number(order.delivery_cost).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-gray-200">
                                <span>Monto Total</span>
                                <span>S/ {Number(order.total || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Address & District with Google Maps Link */}
                        {order.delivery_address && (
                          <div className="bg-white p-4 rounded-2xl border border-gray-200">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dirección de Entrega</p>
                                <p className="text-xs font-bold text-slate-900">{order.delivery_address}</p>
                                {order.delivery_district && (
                                  <p className="text-xs font-semibold text-slate-600">📍 Distrito: {order.delivery_district}</p>
                                )}
                                {order.delivery_reference && (
                                  <p className="text-xs text-gray-500 mt-0.5">Ref: {order.delivery_reference}</p>
                                )}
                              </div>

                              <a
                                href={getGoogleMapsUrl(order.delivery_address, order.delivery_district, order.delivery_reference)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0"
                              >
                                <MapPin className="w-3.5 h-3.5" /> Abrir en Google Maps <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Status Change Buttons */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cambiar Estado del Pedido</p>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_PIPELINE.map(s => {
                              const isCurrent = order.status?.toLowerCase() === s.key.toLowerCase();
                              const isUpdating = updatingId === order.id;

                              if (s.key === 'Anulado') {
                                return (
                                  <button
                                    key={s.key}
                                    onClick={() => !isCurrent && setCancelOrderObj(order)}
                                    disabled={isCurrent || isUpdating}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-40 transition-all"
                                  >
                                    🚫 Anular Pedido
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={s.key}
                                  onClick={() => !isCurrent && updateStatus(order.id, s.key)}
                                  disabled={isCurrent || isUpdating}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    isCurrent
                                      ? `${s.bg} border-current shadow-sm`
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                                  } disabled:opacity-50`}
                                >
                                  {isUpdating && !isCurrent ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                                  {s.label}
                                  {isCurrent && ' ✓'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-gray-200 flex flex-wrap gap-2.5">
                          <button
                            onClick={() => openInvoiceModal(order)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {hasInvoice ? `📄 Ver Comprobante (${order.invoice_number})` : '📄 Emitir Boleta / Factura'}
                          </button>

                          <button
                            onClick={() => !hasInvoice && setEditOrderObj(JSON.parse(JSON.stringify(order)))}
                            disabled={hasInvoice}
                            title={hasInvoice ? 'No se puede editar un pedido con comprobante emitido. Anula el comprobante primero.' : ''}
                            className={`text-xs px-4 py-2 font-bold flex items-center gap-1.5 rounded-xl transition-all ${
                              hasInvoice
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'btn-dark'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar Pedido
                          </button>

                          <button
                            onClick={() => openWhatsApp(order)}
                            className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" /> Reenviar por WhatsApp
                          </button>

                          <button
                            onClick={() => copyWAMessage(order)}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                            {copiedId === order.id ? '¡Mensaje Copiado! ✓' : 'Copiar Mensaje'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: INVOICES REGISTRY ================= */}
      {activeTab === 'comprobantes' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card p-4 border border-gray-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Monto Total Facturado</span>
              <p className="text-2xl font-black text-slate-900">S/ {totalInvoicedAmount.toFixed(2)}</p>
              <p className="text-[11px] text-gray-400">{invoicesList.length} comprobantes en el filtro</p>
            </div>

            <div className="card p-4 border border-gray-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Facturas Emitidas (F001)</span>
              <p className="text-2xl font-black text-blue-600">{facturasCount}</p>
              <p className="text-[11px] text-gray-400">Comprobantes para empresas</p>
            </div>

            <div className="card p-4 border border-gray-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Boletas Emitidas (B001)</span>
              <p className="text-2xl font-black text-emerald-600">{boletasCount}</p>
              <p className="text-[11px] text-gray-400">Comprobantes para personas</p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="card p-4 border border-gray-200 bg-white shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por NumCP (ej. F001, B001), cliente, RUC o pedido..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  className="input pl-9 text-xs"
                />
              </div>

              {/* Type Filter */}
              <div className="sm:col-span-3">
                <select
                  value={invoiceTypeFilter}
                  onChange={e => setInvoiceTypeFilter(e.target.value as any)}
                  className="input text-xs font-bold"
                >
                  <option value="all">Todos los Tipos</option>
                  <option value="factura">Facturas (F001)</option>
                  <option value="boleta">Boletas (B001)</option>
                </select>
              </div>

              {/* Date From */}
              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={invoiceDateFrom}
                  onChange={e => setInvoiceDateFrom(e.target.value)}
                  className="input text-xs"
                  title="Fecha Desde"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={invoiceDateTo}
                  onChange={e => setInvoiceDateTo(e.target.value)}
                  className="input text-xs"
                  title="Fecha Hasta"
                />
              </div>
            </div>

            {/* Quick date presets for Invoices */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-500 font-bold mr-1">📅 Filtros rápidos:</span>
                <button
                  type="button"
                  onClick={() => setQuickDates('today', 'comprobantes')}
                  className={`px-3 py-1 rounded-xl font-bold border transition-all ${
                    invoiceDateFrom === new Date().toISOString().split('T')[0] && invoiceDateTo === new Date().toISOString().split('T')[0]
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDates('7days', 'comprobantes')}
                  className="px-3 py-1 rounded-xl font-bold border bg-white text-gray-700 border-gray-200 hover:bg-gray-100 transition-all"
                >
                  Últimos 7 días
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDates('month', 'comprobantes')}
                  className="px-3 py-1 rounded-xl font-bold border bg-white text-gray-700 border-gray-200 hover:bg-gray-100 transition-all"
                >
                  Este Mes
                </button>
              </div>

              {(invoiceSearch || invoiceTypeFilter !== 'all' || invoiceDateFrom || invoiceDateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceSearch('');
                    setInvoiceTypeFilter('all');
                    setInvoiceDateFrom('');
                    setInvoiceDateTo('');
                  }}
                  className="text-blue-600 hover:underline font-bold text-xs"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          {invoicesList.length === 0 ? (
            <div className="card p-12 text-center border-2 border-dashed border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-bold text-base">No hay comprobantes para mostrar</p>
              <p className="text-gray-400 text-xs mt-1">
                Los comprobantes emitidos desde los pedidos aparecerán en este registro cronológico.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden border border-gray-200 shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3.5">NumCP</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Pedido</th>
                      <th className="p-3.5">Cliente / Receptor</th>
                      <th className="p-3.5 text-right">Total (S/)</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoicesList.map(inv => {
                      const isFactura = inv.invoice_number?.startsWith('F');
                      let parsedReceipt: any = {};
                      if (inv.receipt_data) {
                        try {
                          parsedReceipt = typeof inv.receipt_data === 'string' ? JSON.parse(inv.receipt_data) : inv.receipt_data;
                        } catch (e) {}
                      }

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono font-black text-slate-900 text-sm">
                            {inv.invoice_number}
                          </td>
                          <td className="p-3.5">
                            <span className={`badge ${isFactura ? 'badge-blue' : 'badge-green'}`}>
                              {isFactura ? 'Factura' : 'Boleta'}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-600 whitespace-nowrap">
                            {inv.created_at ? formatDateTime(inv.created_at) : '—'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-700">
                            {inv.order_code}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-900">
                            <div>{isFactura ? (parsedReceipt.razon_social || inv.customer_name) : inv.customer_name}</div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {isFactura ? `RUC: ${parsedReceipt.ruc || '—'}` : `DNI: ${parsedReceipt.dni || '00000000'}`}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                            S/ {Number(inv.total || 0).toFixed(2)}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openInvoiceModal(inv)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-2 rounded-xl transition-all"
                                title="Ver Detalle del Comprobante"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => printInvoicePDF(inv)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-xl transition-all"
                                title="Imprimir / Guardar PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => sendInvoiceWhatsApp(inv)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 rounded-xl transition-all"
                                title="Enviar por WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAnnulInvoiceObj(inv)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 p-2 rounded-xl transition-all"
                                title="Anular Comprobante y Liberar Pedido"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== INVOICE / BOLETA MODAL (EMISSION & READ-ONLY VIEW) ===== */}
      {invoiceModalObj && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {invoiceModalObj.invoice_number ? (
                  <span>Comprobante Emitido — <span className="font-mono font-black">{invoiceModalObj.invoice_number}</span></span>
                ) : (
                  <span>Emitir Comprobante — #{invoiceModalObj.order_code}</span>
                )}
              </h3>
              <button onClick={() => setInvoiceModalObj(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If invoice is already issued: READ-ONLY VIEW with Annul Option */}
            {invoiceModalObj.invoice_number ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Estado del Comprobante</span>
                    <p className="text-sm font-black text-emerald-950">✓ Comprobante Registrado y Válido</p>
                  </div>
                  <span className="badge badge-green font-mono text-xs">{invoiceModalObj.invoice_number}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo:</span>
                    <strong className="text-slate-900">{invoiceModalObj.invoice_number.startsWith('F') ? 'Factura Electrónica' : 'Boleta de Venta Electrónica'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receptor:</span>
                    <strong className="text-slate-900">{clientRazonSocial || invoiceModalObj.customer_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Documento:</span>
                    <strong className="text-slate-900 font-mono">{clientRuc ? `RUC: ${clientRuc}` : `DNI: ${clientDni || '00000000'}`}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha:</span>
                    <span className="text-slate-700">{invoiceModalObj.created_at ? formatDateTime(invoiceModalObj.created_at) : '—'}</span>
                  </div>
                </div>

                {/* Amounts Breakdown */}
                {(() => {
                  const taxPercentage = companyInfo?.config?.tax_percentage ?? 18;
                  const pricesIncludeTax = companyInfo?.config?.prices_include_tax ?? true;
                  const rawTotal = Number(invoiceModalObj.total || 0);
                  const delivery = Number(invoiceModalObj.delivery_cost || 0);
                  const itemsTotal = Math.max(0, rawTotal - delivery);

                  const modalSubtotal = pricesIncludeTax ? (itemsTotal / (1 + taxPercentage / 100)) : Number(invoiceModalObj.subtotal || itemsTotal);
                  const modalTax = pricesIncludeTax ? (itemsTotal - modalSubtotal) : (modalSubtotal * (taxPercentage / 100));
                  const modalTotal = pricesIncludeTax ? rawTotal : (modalSubtotal + modalTax + delivery);

                  return (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Op. Gravada (Subtotal sin IGV):</span>
                        <span className="font-medium text-slate-900">S/ {modalSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>IGV ({taxPercentage}%):</span>
                        <span className="font-medium text-slate-900">S/ {modalTax.toFixed(2)}</span>
                      </div>
                      {delivery > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Costo de Envío:</span>
                          <span className="font-medium text-slate-900">S/ {delivery.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-slate-900 text-sm pt-1.5 border-t border-slate-200">
                        <span>TOTAL FACTURADO:</span>
                        <span className="text-slate-900">S/ {modalTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => printInvoicePDF(invoiceModalObj)}
                      className="btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-700" /> Imprimir / PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInvoiceWhatsApp(invoiceModalObj)}
                      className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs py-2.5 font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar por WA
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAnnulInvoiceObj(invoiceModalObj)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-4 h-4 text-red-600" /> Anular Comprobante y Liberar Pedido
                  </button>
                </div>
              </div>
            ) : (
              /* If NOT issued: ISSUANCE FORM */
              <form onSubmit={handleSaveInvoice} className="space-y-4">
                {invoiceFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{invoiceFormError}</span>
                  </div>
                )}

                {/* Type selector */}
                <div>
                  <label className="input-label font-bold text-gray-900">Tipo de Comprobante</label>
                  {(!companyInfo?.config?.receipt_boleta && !companyInfo?.config?.receipt_factura) ? (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium">
                      ⚠️ No has habilitado Boleta ni Factura en <strong>Configuración &gt; Comprobantes</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {companyInfo?.config?.receipt_factura !== false && (
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceType('factura');
                            setInvoiceSeries(getNextInvoiceSeries('factura', invoiceModalObj));
                          }}
                          className={`py-2.5 text-xs font-bold rounded-2xl border transition-all ${
                            invoiceType === 'factura' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          Factura Comercial
                        </button>
                      )}
                      {companyInfo?.config?.receipt_boleta !== false && (
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceType('boleta');
                            setInvoiceSeries(getNextInvoiceSeries('boleta', invoiceModalObj));
                          }}
                          className={`py-2.5 text-xs font-bold rounded-2xl border transition-all ${
                            invoiceType === 'boleta' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          Boleta de Venta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="input-label font-bold text-gray-900">Serie y Correlativo (Automático)</label>
                  <input
                    type="text"
                    required
                    value={invoiceSeries}
                    onChange={e => setInvoiceSeries(e.target.value)}
                    className="input font-mono font-bold text-slate-900"
                    placeholder="ej. F001-0000001"
                  />
                </div>

                {invoiceType === 'factura' ? (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="input-label text-xs font-bold">RUC del Cliente (11 dígitos) *</label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={clientRuc}
                        onChange={e => setClientRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        className="input bg-white text-xs font-bold font-mono"
                        placeholder="20123456789"
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs font-bold">Razón Social / Empresa *</label>
                      <input
                        type="text"
                        required
                        value={clientRazonSocial}
                        onChange={e => setClientRazonSocial(e.target.value)}
                        className="input bg-white text-xs font-semibold uppercase"
                        placeholder="EMPRESA COMERCIAL S.A.C."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="input-label text-xs font-bold mb-0">DNI del Cliente (8 dígitos)</label>
                      <span className="text-[10px] text-gray-400">Opcional (se usa &quot;CLIENTES VARIOS&quot;)</span>
                    </div>
                    <input
                      type="text"
                      maxLength={8}
                      value={clientDni}
                      onChange={e => setClientDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="input bg-white text-xs font-bold font-mono"
                      placeholder="ej. 76543210 (o dejar en blanco)"
                    />
                  </div>
                )}

                {/* Amounts summary with exact SUNAT math */}
                {(() => {
                  const taxPercentage = companyInfo?.config?.tax_percentage ?? 18;
                  const pricesIncludeTax = companyInfo?.config?.prices_include_tax ?? true;
                  const rawTotal = Number(invoiceModalObj.total || 0);
                  const delivery = Number(invoiceModalObj.delivery_cost || 0);
                  const itemsTotal = Math.max(0, rawTotal - delivery);

                  const modalSubtotal = pricesIncludeTax ? (itemsTotal / (1 + taxPercentage / 100)) : Number(invoiceModalObj.subtotal || itemsTotal);
                  const modalTax = pricesIncludeTax ? (itemsTotal - modalSubtotal) : (modalSubtotal * (taxPercentage / 100));
                  const modalTotal = pricesIncludeTax ? rawTotal : (modalSubtotal + modalTax + delivery);

                  return (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Op. Gravada (Subtotal sin IGV):</span>
                        <span className="font-medium text-slate-900">S/ {modalSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>IGV ({taxPercentage}%):</span>
                        <span className="font-medium text-slate-900">S/ {modalTax.toFixed(2)}</span>
                      </div>
                      {delivery > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Costo de Envío:</span>
                          <span className="font-medium text-slate-900">S/ {delivery.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-slate-900 text-sm pt-1.5 border-t border-slate-200">
                        <span>Total Comprobante:</span>
                        <span className="text-slate-900">S/ {modalTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => printInvoicePDF(invoiceModalObj)}
                      className="btn-outline text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-700" /> Imprimir / PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInvoiceWhatsApp(invoiceModalObj)}
                      className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs py-2.5 font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar por WA
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingInvoice}
                    className="w-full btn-dark py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                  >
                    {submittingInvoice && <Loader2 className="w-4 h-4 animate-spin" />}
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Guardar y Registrar Comprobante
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== ANNUL INVOICE CONFIRMATION MODAL ===== */}
      {annulInvoiceObj && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">¿Anular Comprobante {annulInvoiceObj.invoice_number}?</h3>
                <p className="text-xs text-gray-500">Pedido #{annulInvoiceObj.order_code}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
              ⚠️ Al anular el comprobante, este quedará sin efecto y <strong>el pedido quedará liberado</strong> para que puedas editar sus productos, cantidades o volver a facturarlo.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAnnulInvoiceObj(null)}
                className="btn-outline text-xs px-4 py-2 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingAnnulInvoice}
                onClick={handleAnnulInvoiceConfirm}
                className="btn-danger text-xs px-5 py-2 font-bold flex items-center gap-1.5"
              >
                {submittingAnnulInvoice && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CANCEL ORDER MODAL ===== */}
      {cancelOrderObj && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> Anular Pedido #{cancelOrderObj.order_code}
              </h3>
              <button onClick={() => setCancelOrderObj(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="input-label">Motivo de Anulación</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="ej. Cliente canceló, producto agotado, sin cobertura..."
                  className="input"
                  autoFocus
                />
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                💡 <strong>Devolución de Inventario:</strong> Al confirmar la anulación, los productos contenidos en este pedido volverán automáticamente al stock físico en el módulo de Inventarios (Kardex).
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCancelOrderObj(null)} className="btn-outline text-xs px-4 py-2 font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingCancel} className="btn-danger text-xs px-5 py-2 font-bold flex items-center gap-1.5">
                  {submittingCancel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Anulación y Devolver Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT ORDER MODAL ===== */}
      {editOrderObj && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-800" /> Editar Pedido #{editOrderObj.order_code}
              </h3>
              <button onClick={() => setEditOrderObj(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedOrder} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={editOrderObj.customer_name || ''}
                    onChange={e => setEditOrderObj({ ...editOrderObj, customer_name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="input-label">WhatsApp</label>
                  <input
                    type="text"
                    value={editOrderObj.whatsapp_number || ''}
                    onChange={e => setEditOrderObj({ ...editOrderObj, whatsapp_number: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="input-label">Distrito de Entrega</label>
                  <input
                    type="text"
                    value={editOrderObj.delivery_district || ''}
                    onChange={e => setEditOrderObj({ ...editOrderObj, delivery_district: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="input-label">Costo de Envío (S/)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editOrderObj.delivery_cost || 0}
                    onChange={e => setEditOrderObj({ ...editOrderObj, delivery_cost: parseFloat(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="input-label mb-0">Dirección de Entrega</label>
                    <a
                      href={getGoogleMapsUrl(editOrderObj.delivery_address, editOrderObj.delivery_district, editOrderObj.delivery_reference)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Ver en Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={editOrderObj.delivery_address || ''}
                    onChange={e => setEditOrderObj({ ...editOrderObj, delivery_address: e.target.value })}
                    className="input"
                    placeholder="Av. Principal 123, Comas..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="input-label">Referencia de Ubicación / Link GPS</label>
                  <input
                    type="text"
                    value={editOrderObj.delivery_reference || ''}
                    onChange={e => setEditOrderObj({ ...editOrderObj, delivery_reference: e.target.value })}
                    className="input text-xs"
                    placeholder="Frente al parque, link de Google Maps..."
                  />
                </div>
              </div>

              {/* Items editing section */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Productos del Pedido</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstProd = productsList[0];
                      if (!firstProd) return;
                      const currentItems = editOrderObj.items || [];
                      setEditOrderObj({
                        ...editOrderObj,
                        items: [
                          ...currentItems,
                          {
                            product_id: firstProd.id,
                            product_name: firstProd.name,
                            quantity: 1,
                            unit_price: firstProd.price,
                            total_price: firstProd.price,
                          },
                        ],
                      });
                    }}
                    className="btn-dark text-[11px] px-3 py-1 font-bold flex items-center gap-1"
                  >
                    + Agregar Producto
                  </button>
                </div>

                <div className="space-y-2">
                  {(editOrderObj.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 grid sm:grid-cols-12 gap-2 items-center text-xs">
                      <div className="sm:col-span-6">
                        <select
                          value={item.product_id || ''}
                          onChange={e => {
                            const pid = parseInt(e.target.value);
                            const found = productsList.find(p => p.id === pid);
                            const updated = [...editOrderObj.items];
                            updated[idx] = {
                              ...updated[idx],
                              product_id: pid,
                              product_name: found ? found.name : updated[idx].product_name,
                              unit_price: found ? found.price : updated[idx].unit_price,
                              total_price: (found ? found.price : updated[idx].unit_price) * updated[idx].quantity,
                            };
                            setEditOrderObj({ ...editOrderObj, items: updated });
                          }}
                          className="input text-xs py-1.5"
                        >
                          {productsList.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (S/ {p.price})</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1">
                        <span className="text-gray-500 text-[10px]">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const q = parseInt(e.target.value) || 1;
                            const updated = [...editOrderObj.items];
                            updated[idx] = {
                              ...updated[idx],
                              quantity: q,
                              total_price: (updated[idx].unit_price || 0) * q,
                            };
                            setEditOrderObj({ ...editOrderObj, items: updated });
                          }}
                          className="input text-xs py-1.5 text-center"
                        />
                      </div>

                      <div className="sm:col-span-2 text-right font-black text-slate-900">
                        S/ {Number(item.total_price || (item.unit_price * item.quantity)).toFixed(2)}
                      </div>

                      <div className="sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editOrderObj.items.filter((_: any, i: number) => i !== idx);
                            setEditOrderObj({ ...editOrderObj, items: updated });
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t flex justify-between items-center text-xs font-bold text-slate-900">
                  <span>Nuevo Total Pedido:</span>
                  <span className="text-base font-black">
                    S/ {(
                      (editOrderObj.items || []).reduce((acc: number, item: any) => acc + (Number(item.total_price) || (Number(item.unit_price) * Number(item.quantity))), 0) +
                      Number(editOrderObj.delivery_cost || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditOrderObj(null)} className="btn-outline text-xs px-4 py-2 font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingEdit} className="btn-dark text-xs px-5 py-2 font-bold flex items-center gap-1.5">
                  {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
