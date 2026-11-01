import React, { useState } from 'react';
import { Download, Calendar, TrendingUp, Package, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import type { Product, Sale, StockMovement, Supplier } from '../types';

interface ReportsProps {
  products: Product[];
  sales: Sale[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
}

const Reports: React.FC<ReportsProps> = ({ products, sales, stockMovements }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
  });

  // Filter data by date range
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.date).toISOString().split('T')[0];
    return saleDate >= dateRange.startDate && saleDate <= dateRange.endDate;
  });

  const filteredMovements = stockMovements.filter(movement => {
    const movementDate = new Date(movement.date).toISOString().split('T')[0];
    return movementDate >= dateRange.startDate && movementDate <= dateRange.endDate;
  });

  // Sales Report Data
  const salesReport = {
    totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    totalTransactions: filteredSales.length,
    totalItemsSold: filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
    averageOrderValue: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0) / filteredSales.length : 0,
    topProducts: Object.values(
      filteredSales.reduce((acc, sale) => {
        if (!acc[sale.productId]) {
          acc[sale.productId] = {
            productName: sale.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        acc[sale.productId].quantity += sale.quantity;
        acc[sale.productId].revenue += sale.totalAmount;
        return acc;
      }, {} as Record<string, { productName: string; quantity: number; revenue: number }>)
    ).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };

  // Inventory Report Data
  const inventoryReport = {
    totalProducts: products.length,
    totalValue: products.reduce((sum, product) => sum + (product.price * product.quantity), 0),
    totalCost: products.reduce((sum, product) => sum + (product.cost * product.quantity), 0),
    lowStockItems: products.filter(product => product.quantity <= product.minStock).length,
    categoryBreakdown: Object.entries(
      products.reduce((acc, product) => {
        if (!acc[product.category]) {
          acc[product.category] = {
            count: 0,
            value: 0,
            cost: 0,
            quantity: 0,
          };
        }
        acc[product.category].count += 1;
        acc[product.category].value += product.price * product.quantity;
        acc[product.category].cost += product.cost * product.quantity;
        acc[product.category].quantity += product.quantity;
        return acc;
      }, {} as Record<string, { count: number; value: number; cost: number; quantity: number }>)
    ),
    lowStockProducts: products.filter(product => product.quantity <= product.minStock),
  };

  // Movement Report Data
  const movementReport = {
    totalMovements: filteredMovements.length,
    stockIn: filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0),
    stockOut: filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0),
    totalPurchaseCost: filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + (m.totalCost || 0), 0),
    recentMovements: filteredMovements.slice(0, 10),
  };

  // Export to CSV function
  const exportToCSV = (data: Array<Record<string, string | number | null | undefined>>, filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'inventory', label: 'Inventory Report', icon: Package },
    { id: 'movements', label: 'Stock Movements', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition-colors flex-shrink-0 min-w-0 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'sales' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Sales Report</h3>
            </div>
            <button
              onClick={() => exportToCSV(filteredSales, 'sales_report')}
              className="text-primary-600 hover:text-primary-700 transition-colors"
              title="Export Sales Data"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          {/* Sales Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(salesReport.totalRevenue)}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-lg font-bold text-gray-900">{salesReport.totalTransactions}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Items Sold</p>
              <p className="text-lg font-bold text-gray-900">{salesReport.totalItemsSold}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Avg Order</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(salesReport.averageOrderValue)}</p>
            </div>
          </div>

          {/* Top Products */}
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Top Products</h4>
            {salesReport.topProducts.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sales data</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {salesReport.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-gray-100">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                      <p className="text-xs text-gray-600">{product.quantity} units</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-3">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Inventory Report</h3>
            </div>
            <button
              onClick={() => exportToCSV(inventoryReport.categoryBreakdown.map(([category, data]) => ({ category, ...data })), 'inventory_by_category')}
              className="text-primary-600 hover:text-primary-700 transition-colors"
              title="Export Inventory Data"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          {/* Inventory Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Products</p>
              <p className="text-lg font-bold text-gray-900">{inventoryReport.totalProducts}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(inventoryReport.totalValue)}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Cost</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(inventoryReport.totalCost)}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
              <p className="text-lg font-bold text-red-600">{inventoryReport.lowStockItems}</p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-700 mb-3">By Category</h4>
            {inventoryReport.categoryBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No inventory data</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {inventoryReport.categoryBreakdown.map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-100">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{category}</p>
                      <p className="text-xs text-gray-600">{data.count} products • {data.quantity} units</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-3">{formatCurrency(data.value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Products */}
          {inventoryReport.lowStockProducts.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-3">Low Stock Alert</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {inventoryReport.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-600">{product.category} • SKU: {product.sku}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold text-red-600">{product.quantity} left</p>
                      <p className="text-xs text-gray-600">Min: {product.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Stock Movements</h3>
            </div>
            <button
              onClick={() => exportToCSV(filteredMovements, 'stock_movements')}
              className="text-primary-600 hover:text-primary-700 transition-colors"
              title="Export Movement Data"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          {/* Movement Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Movements</p>
              <p className="text-lg font-bold text-gray-900">{movementReport.totalMovements}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Stock In</p>
              <p className="text-lg font-bold text-green-600">{movementReport.stockIn}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600 mb-1">Stock Out</p>
              <p className="text-lg font-bold text-red-600">{movementReport.stockOut}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Purchase Cost</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(movementReport.totalPurchaseCost)}</p>
            </div>
          </div>

          {/* Recent Movements */}
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Recent Movements</h4>
            {movementReport.recentMovements.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No movement data</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {movementReport.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-gray-100">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{movement.productName}</p>
                      <p className="text-xs text-gray-600">{movement.reason} • {new Date(movement.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`text-sm font-semibold ${movement.type === 'in' ? 'text-green-600' : movement.type === 'out' ? 'text-red-600' : 'text-gray-600'}`}>
                        {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{movement.quantity}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">{movement.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
