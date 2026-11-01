import React, { useState } from 'react';
import { Plus, Search, Calendar, ShoppingCart, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Product, Sale } from '../types';
import SaleForm from './SaleForm';

interface SalesProps {
  products: Product[];
  sales: Sale[];
  onAddSale: (sale: Omit<Sale, 'id'>) => void;
  onUpdateSale: (id: string, sale: Omit<Sale, 'id'>) => void;
  onDeleteSale: (id: string) => void;
  onUpdateProductQuantity: (productId: string, newQuantity: number) => void;
}

const Sales: React.FC<SalesProps> = ({ products, sales, onAddSale, onUpdateSale, onDeleteSale, onUpdateProductQuantity }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDate = !dateFilter || sale.date.startsWith(dateFilter);
    return matchesSearch && matchesDate;
  });

  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalItemsSold = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);

  const handleSaleSubmit = (saleData: Omit<Sale, 'id'>) => {
    if (editingSale) {
      onUpdateSale(editingSale.id, saleData);
    } else {
      onAddSale(saleData);
      
      // Update product quantity only for new sales
      const product = products.find(p => p.id === saleData.productId);
      if (product) {
        onUpdateProductQuantity(saleData.productId, product.quantity - saleData.quantity);
      }
    }
    
    setShowForm(false);
    setEditingSale(null);
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    onDeleteSale(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSale(null);
  };

  if (showForm) {
    return (
      <SaleForm
        products={products}
        editingSale={editingSale}
        onSubmit={handleSaleSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-primary-700 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Sale</span>
        </button>
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Sales</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalSalesAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Items Sold</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalItemsSold}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Transactions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredSales.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
          />
        </div>
      </div>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sales Found</h3>
          <p className="text-gray-600 mb-6">
            {sales.length === 0 
              ? "Start recording your sales to track business performance."
              : "No sales match your search criteria."
            }
          </p>
          {sales.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
            >
              Record Your First Sale
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-base">{sale.productName}</h3>
                    <p className="text-sm text-gray-600">{sale.customerName || 'Walk-in Customer'}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(sale)}
                        className="p-2 text-gray-400 hover:text-primary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Edit sale"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete sale"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{formatDate(sale.date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-medium">{sale.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unit Price</p>
                    <p className="font-medium">{formatCurrency(sale.unitPrice)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{sale.productName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(sale.unitPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                            title="Edit sale"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete sale"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Sales;