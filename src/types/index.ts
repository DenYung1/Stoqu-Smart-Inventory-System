export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  description?: string;
  supplierId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName?: string;
  paymentMethod?: 'cash' | 'momo' | 'card' | 'credit';
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  supplierId?: string;
  supplierName?: string;
  unitCost?: number;
  totalCost?: number;
  date: string;
  createdBy: string;
}

export interface Notification {
  id: string;
  type: 'low_stock' | 'reorder' | 'sale' | 'system';
  title: string;
  message: string;
  productId?: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface Settings {
  businessName: string;
  ownerName: string;
  phone: string;
  email?: string;
  address?: string;
  currency: string;
  taxRate: number;
  lowStockThreshold: number;
  autoBackup: boolean;
  notifications: {
    lowStock: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
  };
}

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  totalSales: number;
  todaySales: number;
  weekSales: number;
}

export interface UserProfile {
  id: string;
  email: string;
  business_name?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  is_banned: boolean;
  banned_at?: string;
  banned_by?: string;
  ban_reason?: string;
  last_login_at?: string;
}