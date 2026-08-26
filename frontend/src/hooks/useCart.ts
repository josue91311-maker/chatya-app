import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Promotion } from '../types/store';

export interface CartItem {
  product: Product;
  quantity: number;
  promotionApplied?: Promotion;
}

interface CartStore {
  items: CartItem[];
  companySlug: string | null;
  setCompanySlug: (slug: string) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: (deliveryCost?: number, taxRate?: number) => number;
  getItemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      companySlug: null,
      setCompanySlug: (slug) => set({ companySlug: slug }),
      addItem: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.product.id === product.id);
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity: 1 }] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((item) => item.product.id !== productId) }),
      updateQuantity: (productId, quantity) =>
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }),
      clearCart: () => set({ items: [] }),
      getSubtotal: () =>
        get().items.reduce((total, item) => total + item.product.price * item.quantity, 0),
      getTotal: (deliveryCost = 0, taxRate = 0) => {
        const subtotal = get().getSubtotal();
        return subtotal + deliveryCost + subtotal * taxRate;
      },
      getItemCount: () =>
        get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    {
      name: 'chatya-cart',
    }
  )
);
