import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  id: string;
  originalItemId: string; // The actual menu item UUID for database inserts
  name: string;
  price: number;
  image_url?: string;
  vendor_id: string;
  vendor_name: string;
  diamond_reward: number;
  quantity: number;
}

interface FoodCartStore {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getTotalDiamonds: () => number;
}

export const useFoodCart = create<FoodCartStore>()(
  persist(
    (set, get) => ({
      cart: [],
      addToCart: (item) => {
        set((state) => {
          const existingItem = state.cart.find((i) => i.id === item.id);
          if (existingItem) {
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        });
      },
      removeFromCart: (itemId) => {
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== itemId),
        }));
      },
      updateQuantity: (itemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { cart: state.cart.filter((i) => i.id !== itemId) };
          }
          return {
            cart: state.cart.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        });
      },
      clearCart: () => set({ cart: [] }),
      getTotal: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      getTotalDiamonds: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.diamond_reward * item.quantity, 0);
      },
    }),
    {
      name: "food-cart-storage",
    }
  )
);
