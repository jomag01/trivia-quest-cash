// Simple in-app event bus for keeping cart UI in sync across components

const CART_UPDATED_EVENT = "app:cart-updated";

export function emitCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function onCartUpdated(handler: () => void) {
  window.addEventListener(CART_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
}
