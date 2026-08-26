// ===== ChatYa Type Definitions =====

// --- Store / Products ---
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  unit_name?: string;
  brand_id?: number;
  brand_name?: string;
  price: number;
  cost_price?: number;
  previous_price?: number;
  stock: number;
  image_url?: string;
  images?: ProductImage[];
  category_id: number;
  category?: Category;
  is_featured?: boolean;
  is_active?: boolean;
  promotion_badge?: string;
  max_per_order?: number;
  sku?: string;
  allow_unit_selection?: boolean;
  unit_factors?: any[];
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  children?: Category[];
  sort_order: number;
  is_active: boolean;
}

export interface Promotion {
  id: number;
  name: string;
  description?: string;
  promotion_type: 'percentage' | '2x1' | '3x2' | 'fixed' | 'combo';
  discount_value?: number;
  badge_text?: string;
  is_active: boolean;
}

// --- Store Info ---
export interface StoreInfo {
  slug: string;
  name: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  phone_whatsapp: string;
  currency: string;
  currency_symbol: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  dine_in_enabled: boolean;
  tax_enabled: boolean;
  tax_percentage: number;
  prices_include_tax: boolean;
  delivery_cost: number;
  free_delivery_from?: number;
  min_order_amount?: number;
  estimated_delivery_minutes?: number;
  welcome_message?: string;
  payment_methods: PaymentMethod[];
  order_statuses?: OrderStatus[];
  receipt_none: boolean;
  receipt_boleta: boolean;
  receipt_factura: boolean;
  hide_out_of_stock: boolean;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: string;
  instructions?: string;
  is_active: boolean;
  sort_order: number;
}

// --- Order ---
export interface OrderItem {
  product_id: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
  promotion_applied?: unknown;
}

export interface Order {
  id?: number;
  order_code?: string;
  tracking_token?: string;
  status?: string;
  customer_name: string;
  whatsapp_number: string;
  delivery_method: 'delivery' | 'pickup' | 'dine_in';
  payment_method: string;
  payment_method_name?: string;
  receipt_type: 'none' | 'boleta' | 'factura';
  receipt_data?: ReceiptData;
  delivery_address?: string;
  delivery_reference?: string;
  delivery_district?: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  delivery_cost: number;
  total: number;
  company_name?: string;
  company_phone?: string;
  notes?: string;
  created_at?: string;
}

export interface ReceiptData {
  document_type?: string;
  document_number?: string;
  full_name?: string;
  ruc?: string;
  business_name?: string;
  fiscal_address?: string;
  email?: string;
}

// --- Tracking ---
export interface TrackingOrder {
  order_code: string;
  status: string;
  status_color?: string;
  customer_name: string;
  delivery_method: string;
  payment_method: string;
  items: OrderItem[];
  subtotal: number;
  delivery_cost: number;
  total: number;
  created_at: string;
  estimated_delivery_at?: string;
  status_history: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  status: string;
  note?: string;
  changed_at: string;
}

// --- Admin ---
export interface OrderStatus {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_final: boolean;
}

export interface Customer {
  id: number;
  full_name: string;
  whatsapp_number: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order_at?: string;
  created_at: string;
}

export interface DashboardStats {
  sales_today: number;
  sales_month: number;
  orders_pending: number;
  orders_delivered: number;
  new_customers_today: number;
  avg_order_value: number;
  top_products: TopProduct[];
  recent_orders: RecentOrder[];
  sales_chart: SalesChartPoint[];
}

export interface TopProduct {
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface RecentOrder {
  id: number;
  order_code: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

export interface SalesChartPoint {
  date: string;
  sales: number;
  orders: number;
}
