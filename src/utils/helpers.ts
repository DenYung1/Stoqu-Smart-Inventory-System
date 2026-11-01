import type { Product, Sale } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const generateId = (): string => {
  return uuidv4();
};

export const calculateDashboardStats = (products: Product[], sales: Sale[]) => {
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
  const lowStockItems = products.filter(product => product.quantity <= product.minStock).length;
  
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  const today = new Date().toDateString();
  const todaySales = sales
    .filter(sale => new Date(sale.date).toDateString() === today)
    .reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSales = sales
    .filter(sale => new Date(sale.date) >= weekAgo)
    .reduce((sum, sale) => sum + sale.totalAmount, 0);

  return {
    totalProducts,
    totalValue,
    lowStockItems,
    totalSales,
    todaySales,
    weekSales,
  };
};