export type ShiftStatus = 'open' | 'closed';
export type ProductCategory = 'xis' | 'dog' | 'hotdog' | 'bebida' | 'porcoes' | 'side';
export type OrderType = 'local' | 'takeaway' | 'delivery';
export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';
export type OrderStatus = 'pending' | 'completed' | 'canceled';
export type UserRole = 'admin' | 'cashier';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export interface AdminDashboardProps {
  user: any;
  onNavigateToPos: () => void;
  onLogout: () => void;
}

export interface Shift {
  id: string;
  name: string; // Added for Shift-Centric Analytics (DD/MM/YY)
  opened_at: string;
  closed_at?: string;
  initial_float: number;
  status: ShiftStatus;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  is_available: boolean;
  description?: string;
  menu_number?: number;
}

export interface Neighborhood {
  id: string;
  name: string;
  delivery_fee: number;
}

export interface Tag {
  id: string;
  label: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface Order {
  id: number;
  shift_id: string;
  customer_name: string;
  customer_phone?: string;
  type: OrderType;
  neighborhood_id?: string;
  delivery_fee?: number; // Added to match DB column if snapshot alias fails
  delivery_fee_snapshot: number;
  payment_method: PaymentMethod;
  total_amount: number;
  status: OrderStatus;
  origin?: 'pos' | 'web';
  created_at: string;
  daily_number?: number;
  discount_amount?: number;
  discount_type?: 'fixed' | 'percentage';
  discount_reason?: string;
  // Campos de Endereço Estruturados
  address_street?: string;
  address_number?: string;
  address_complement?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: number;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  // Adicionado para UI
  product_name?: string;
}

export interface CartItem {
  tempId: string;
  product: Product;
  quantity: number;
  notes: string;
  tags: string[]; // Lista de etiquetas
  addons?: Addon[]; // Adicionais selecionados
}

export type ExpenseCategory = 'energia' | 'contador' | 'salarios' | 'mercado' | 'embalagens' | 'gas' | 'hamburguer' | 'pao' | 'outros';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expense_date: string;
  shift_id?: string | null; // Adicionado para Shift-Centric
  created_at: string;
  created_by?: string;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string; // 'un', 'kg', 'L', 'g', 'ml'
  current_quantity: number;
  min_quantity: number;
  cost_per_unit?: number; // Custo unitário para relatório financeiro
  updated_at?: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  stock_item_id: string;
  quantity: number;
  stock_item?: StockItem; // Para join
}