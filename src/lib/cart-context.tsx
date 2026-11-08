'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  type?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('lokstor_cart');
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lokstor_cart', JSON.stringify(items));
  }, [items]);

  // Sync stored cart item prices with live Firestore database
  useEffect(() => {
    if (items.length === 0) return;
    let isCancelled = false;

    async function syncCartWithLiveDatabase() {
      try {
        let hasChanges = false;
        const freshItems = await Promise.all(items.map(async (item) => {
          try {
            const rawId = item.id.includes('_') ? item.id.split('_')[0] : item.id;
            const snap = await getDoc(doc(db, 'products', rawId));
            if (snap.exists()) {
              const data = snap.data();
              let livePrice = data.price;
              if (item.id.includes('_') && Array.isArray(data.variants)) {
                const found = data.variants.find((v: any) => v.id === item.id);
                if (found && typeof found.price === 'number') {
                  livePrice = found.price;
                }
              }
              if (typeof livePrice === 'number' && livePrice !== item.price) {
                hasChanges = true;
                return { ...item, price: livePrice, name: data.name || item.name };
              }
            }
          } catch (e) {}
          return item;
        }));

        if (!isCancelled && hasChanges) {
          setItems(freshItems);
        }
      } catch (e) {}
    }

    syncCartWithLiveDatabase();

    return () => { isCancelled = true; };
  }, [items.length]);

  const addToCart = (newItem: CartItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === newItem.id);
      if (exists) {
        return prev.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + newItem.quantity } : i);
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
