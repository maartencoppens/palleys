export type CartItem = {
  previewId: string;
  size: string;
  expiresAt: string; // ISO, komt van de backend
};

export type StoredCart = { cartId?: string; items: CartItem[] };

const KEY = "palleys:cart";

export function loadCart(): StoredCart {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as StoredCart;
    const now = Date.now();
    // Items waarvan de foto op de server verlopen is, horen niet meer in de cart.
    const items = parsed.items.filter(
      (i) => new Date(i.expiresAt).getTime() > now,
    );
    return { cartId: items.length > 0 ? parsed.cartId : undefined, items };
  } catch {
    return { items: [] };
  }
}

export function saveCart(cart: StoredCart) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // localStorage kan geblokkeerd of vol zijn: de cart werkt dan gewoon per sessie.
  }
}
