import { Order } from '@/types/store';

/**
 * Format an order into the WhatsApp message text
 */
export function formatOrderMessage(order: Order): string {
  const currency = order.company_name ? 'S/' : 'S/'; // Default to soles

  const deliveryLabels: Record<string, string> = {
    delivery: '🚚 Delivery',
    pickup: '🏪 Recojo en tienda',
    dine_in: '🍽️ Consumo en local',
  };

  const receiptLabels: Record<string, string> = {
    none: 'Sin comprobante',
    boleta: 'Boleta',
    factura: 'Factura',
  };

  let message = `Hola! 👋 Quiero confirmar mi pedido 🛒\n\n`;
  message += `📋 *Pedido:* ${order.order_code || 'PENDIENTE'}\n`;
  message += `👤 *Nombre:* ${order.customer_name}\n`;
  message += `📱 *WhatsApp:* ${order.whatsapp_number}\n`;
  message += `\n🛍️ *Productos:*\n`;

  order.items.forEach((item) => {
    const itemTotal = (item.unit_price * item.quantity).toFixed(2);
    message += `  • ${item.quantity}x ${item.product_name} → ${currency} ${itemTotal}\n`;
    if (item.discount_amount > 0) {
      message += `    *(Descuento: -${currency} ${item.discount_amount.toFixed(2)})*\n`;
    }
  });

  message += `\n💰 *Resumen:*\n`;
  message += `  Subtotal: ${currency} ${order.subtotal.toFixed(2)}\n`;

  if (order.discount_amount > 0) {
    message += `  Descuento: -${currency} ${order.discount_amount.toFixed(2)}\n`;
  }

  if (order.delivery_cost > 0) {
    message += `  Delivery: ${currency} ${order.delivery_cost.toFixed(2)}\n`;
  }

  if (order.tax_amount > 0) {
    message += `  Impuesto: ${currency} ${order.tax_amount.toFixed(2)}\n`;
  }

  message += `  *TOTAL: ${currency} ${order.total.toFixed(2)}*\n`;
  message += `\n💳 *Pago:* ${order.payment_method_name || order.payment_method}\n`;
  message += `🚗 *Entrega:* ${deliveryLabels[order.delivery_method] || order.delivery_method}\n`;

  if (order.delivery_method === 'delivery' && order.delivery_address) {
    message += `📍 *Dirección:* ${order.delivery_address}\n`;
    if (order.delivery_reference) {
      message += `🗺️ *Referencia:* ${order.delivery_reference}\n`;
    }
    if (order.delivery_district) {
      message += `📌 *Distrito:* ${order.delivery_district}\n`;
    }
  }

  if (order.receipt_type !== 'none') {
    message += `🧾 *Comprobante:* ${receiptLabels[order.receipt_type]}\n`;
    if (order.receipt_data) {
      if (order.receipt_type === 'boleta') {
        message += `  DNI: ${order.receipt_data.document_number || '-'}\n`;
        message += `  Nombre: ${order.receipt_data.full_name || '-'}\n`;
      } else {
        message += `  RUC: ${order.receipt_data.ruc || '-'}\n`;
        message += `  Razón Social: ${order.receipt_data.business_name || '-'}\n`;
      }
    }
  }

  if (order.notes) {
    message += `\n📝 *Notas:* ${order.notes}\n`;
  }

  message += `\n✅ *¡Gracias por tu pedido!*`;

  return message;
}

/**
 * Generate a WhatsApp wa.me URL with the order message pre-filled
 */
export function generateWhatsAppUrl(order: Order, phone: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const message = formatOrderMessage(order);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp with order message (handles preview mode)
 */
export function sendOrderToWhatsApp(
  order: Order,
  phone: string,
  isPreview = false
): string {
  const url = generateWhatsAppUrl(order, phone);
  if (!isPreview) {
    window.open(url, '_blank');
  }
  return formatOrderMessage(order);
}
