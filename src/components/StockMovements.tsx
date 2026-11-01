import React, { useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, RotateCcw, Package, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Product, Supplier, StockMovement } from '../types';
import StockMovementForm from './StockMovementForm';

interface StockMovementsProps {
  products: Product[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
  onAddStockMovement: (movement: Omit<StockMovement, 'id'>) => void;
  onUpdateStockMovement: (id: string, movement: Omit<StockMovement, 'id'>) => void;
  onDeleteStockMovement: (id: string) => void;
  onUpdateProductQuantity: (productId: string, newQuantity: number) => void;
}

const StockMovements: React.FC<StockMovementsProps> = ({ 
  products, 
  suppliers, 
  stockMovements, 
  onAddStockMovement, 
  onUpdateStockMovement,
  onDeleteStockMovement,
  onUpdateProductQuantity 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredMovements = stockMovements.filter(movement => {
    const matchesSearch = movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || movement.type === filterType;
    const matchesDate = !dateFilter || movement.date.startsWith(dateFilter);
    return matchesSearch && matchesType && matchesDate;
  });

  const handleMovementSubmit = (movementData: Omit<StockMovement, 'id'>) => {
    if (editingMovement) {
      onUpdateStockMovement(editingMovement.id, movementData);
    } else {
      onAddStockMovement(movementData);
      
      // Update product quantity only for new movements
      const product = products.find(p => p.id === movementData.productId);
      if (product) {
        let newQuantity = product.quantity;
        if (movementData.type === 'in') {
          newQuantity += movementData.quantity;
        } else if (movementData.type === 'out') {
          newQuantity -= movementData.quantity;
        } else if (movementData.type === 'adjustment') {
          newQuantity = movementData.quantity; // Direct adjustment to specific quantity
        }
        onUpdateProductQuantity(movementData.productId, Math.max(0, newQuantity));
      }
    }
    
    setShowForm(false);
    setEditingMovement(null);
  };

  const handleEdit = (movement: StockMovement) => {
    setEditingMovement(movement);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    onDeleteStockMovement(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMovement(null);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'adjustment': return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in': return 'text-green-600 bg-green-50';
      case 'out': return 'text-red-600 bg-red-50';
      case 'adjustment': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (showForm) {
    return (
      <StockMovementForm
        products={products}
        suppliers={suppliers}
        editingMovement={editingMovement}
        onSubmit={handleMovementSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Stock Movements</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Movement</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Stock Movements List */}
      {filteredMovements.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stock Movements Found</h3>
          <p className="text-gray-600 mb-6">
            {stockMovements.length === 0 
              ? "Start tracking stock movements to monitor inventory changes."
              : "No movements match your search criteria."
            }
          </p>
          {stockMovements.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Record First Movement
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(movement.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{movement.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        <span className="capitalize">{movement.type === 'in' ? 'Stock In' : movement.type === 'out' ? 'Stock Out' : 'Adjustment'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={movement.type === 'out' ? 'text-red-600' : 'text-green-600'}>
                        {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.supplierName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.totalCost ? formatCurrency(movement.totalCost) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(movement)}
                          className="text-primary-600 hover:text-primary-900 transition-colors"
                          title="Edit movement"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(movement.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete movement"
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
      )}
    </div>
  );
};

export default StockMovements;