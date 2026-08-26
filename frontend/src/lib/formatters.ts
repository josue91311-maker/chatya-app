/**
 * Format currency with symbol
 */
export function formatCurrency(
  amount: number,
  symbol = 'S/',
  decimals = 2
): string {
  return `${symbol} ${amount.toFixed(decimals)}`;
}

function parseSafeDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If the ISO string does not end with Z or have timezone offset, append Z because SQLite stores in UTC
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !(dateStr.lastIndexOf('-') > 10)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
}

/**
 * Format date to locale string
 */
export function formatDate(dateStr: string, locale = 'es-PE'): string {
  if (!dateStr) return '-';
  const d = parseSafeDate(dateStr);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format datetime to locale string
 */
export function formatDateTime(dateStr: string, locale = 'es-PE'): string {
  if (!dateStr) return '-';
  const d = parseSafeDate(dateStr);
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g. "hace 5 minutos")
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '-';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'hace un momento';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays} días`;
  return formatDate(dateStr);
}

/**
 * Format WhatsApp number for display
 */
export function formatWhatsApp(number: string): string {
  const clean = number.replace(/\D/g, '');
  if (clean.startsWith('51') && clean.length === 11) {
    return `+51 ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  return `+${clean}`;
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/**
 * Delivery method label in Spanish
 */
export function deliveryLabel(method: string): string {
  const labels: Record<string, string> = {
    delivery: '🚚 Delivery',
    pickup: '🏪 Recojo',
    dine_in: '🍽️ En local',
  };
  return labels[method] || method;
}

/**
 * Receipt type label
 */
export function receiptLabel(type: string): string {
  const labels: Record<string, string> = {
    none: 'Sin comprobante',
    boleta: 'Boleta',
    factura: 'Factura',
  };
  return labels[type] || type;
}

/**
 * Calculate discount percentage
 */
export function discountPercent(price: number, previousPrice: number): number {
  if (!previousPrice || previousPrice <= price) return 0;
  return Math.round(((previousPrice - price) / previousPrice) * 100);
}
