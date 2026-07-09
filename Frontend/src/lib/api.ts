const STORAGE_KEY = "inv_api_base";
const TOKEN_KEY = "inv_token";
const USER_KEY = "inv_user";

export function getApiBase(): string {
  if (typeof window === "undefined") return "https://pos-inventory-system-crjx.vercel.app";
  return localStorage.getItem(STORAGE_KEY) || (
    import.meta.env.DEV
      ? "http://localhost:5000"
      : "https://pos-inventory-system-crjx.vercel.app"
  );
}
export function setApiBase(url: string) {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getUser(): { name?: string; role?: string; email?: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setUser(u: unknown) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiBase();
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "message" in data)
      ? (data as { message: string }).message
      : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// Types
export interface Variant {
  _id?: string;
  size: string;
  color: string;
  stock: number;
  barcode: string;
}
export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  variants: Variant[];
  productCode?: string;
  createdAt?: string;
}
export interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}
export interface Purchase {
  _id: string;
  supplier: Supplier | string;
  productId: Product | string;
  barcode: string;
  quantity: number;
  createdAt?: string;
}
export interface BillItem {
  productName: string;
  barcode: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  total: number;
}
export interface Bill {
  _id: string;
  items: BillItem[];
  totalAmount: number;
  createdAt?: string;
}
export interface DashboardStats {
  totalProducts: number;
  totalSuppliers: number;
  totalBills: number;
  revenue: number;
}