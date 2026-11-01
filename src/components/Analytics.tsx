import React from 'react';
import { TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import type { Product, Sale } from '../types';

interface AnalyticsProps {
  products: Product[];
  sales: Sale[];
}

const Analytics: React.FC<AnalyticsProps> = ({ products, sales }) => {
  // Calculate analytics data
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalCost = sales.reduce((sum, sale) => {
    const product = products.find(p => p.id === sale.productId);
    return sum + (product ? product.cost * sale.quantity : 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Top selling products
  const productSales = sales.reduce((acc, sale) => {
    if (!acc[sale.productId]) {
      acc[sale.productId] = {
        productName: sale.productName,
        totalQuantity: 0,
        totalRevenue: 0,
      };
    }
    acc[sale.productId].totalQuantity += sale.quantity;
    acc[sale.productId].totalRevenue += sale.totalAmount;
    return acc;
  }, {} as Record<string, { productName: string; totalQuantity: number; totalRevenue: number }>);

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // Recent sales trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toDateString();
  }).reverse();

  const dailySales = last7Days.map(date => {
    const daySales = sales.filter(sale => new Date(sale.date).toDateString() === date);
    return {
      date,
      sales: daySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      count: daySales.length,
    };
  });

  // Category performance
  const categoryStats = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = {
        totalProducts: 0,
        totalValue: 0,
        totalSales: 0,
      };
    }
    acc[product.category].totalProducts += 1;
    acc[product.category].totalValue += product.price * product.quantity;
    
    const productSalesData = sales.filter(sale => sale.productId === product.id);
    acc[product.category].totalSales += productSalesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    return acc;
  }, {} as Record<string, { totalProducts: number; totalValue: number; totalSales: number }>);

  const sortedCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b.totalSales - a.totalSales)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Profit</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Profit Margin</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Transactions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{sales.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
          <div className="space-y-3">
            {dailySales.map((day, index) => {
              const maxSales = Math.max(...dailySales.map(d => d.sales), 1);
              const percentage = (day.sales / maxSales) * 100;
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-gray-600">
                    {new Date(day.date).toLocaleDateString('en-GH', { weekday: 'short' })}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(day.sales)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          {topProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No sales data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{product.productName}</p>
                      <p className="text-sm text-gray-600">{product.totalQuantity} units sold</p>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(product.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
        {sortedCategories.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No category data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCategories.map(([category, stats]) => (
              <div key={category} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 truncate">{category}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Products:</span>
                    <span className="font-medium">{stats.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inventory Value:</span>
                    <span className="font-medium">{formatCurrency(stats.totalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sales:</span>
                    <span className="font-medium">{formatCurrency(stats.totalSales)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;