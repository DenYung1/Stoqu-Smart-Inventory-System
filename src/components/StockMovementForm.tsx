import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import type { Product, Supplier, StockMovement } from '../types';

interface StockMovementFormProps {
  products: Product[];
  suppliers: Supplier[];
  editingMovement?: StockMovement | null;
  onSubmit: (movement: Omit<StockMovement, 'id'>) => void;
  onCancel: () => void;
}

const StockMovementForm: React.FC<StockMovementFormProps> = ({ products, suppliers, editingMovement, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    productId: editingMovement?.productId || '',
    type: editingMovement?.type || 'in' as 'in' | 'out' | 'adjustment',
    quantity: editingMovement?.quantity || 0,
    reason: editingMovement?.reason || '',
    reference: editingMovement?.reference || '',
    supplierId: editingMovement?.supplierId || '',
    unitCost: editingMovement?.unitCost || 0,
  });

  const selectedProduct = products.find(p => p.id === formData.productId);
  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
  const totalCost = formData.unitCost * formData.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;

    const movementData: Omit<StockMovement, 'id'> = {
      productId: formData.productId,
      productName: selectedProduct.name,
      type: formData.type,
      quantity: formData.quantity,
      reason: formData.reason,
      reference: formData.reference || undefined,
      supplierId: formData.supplierId || undefined,
      supplierName: selectedSupplier?.name,
      unitCost: formData.unitCost > 0 ? formData.unitCost : undefined,
      totalCost: totalCost > 0 ? totalCost : undefined,
      date: new Date().toISOString(),
      createdBy: 'Owner', // In a real app, this would be the logged-in user
    };

    onSubmit(movementData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const movementTypes = [
    { value: 'in', label: 'Stock In', description: 'Add inventory (purchases, returns)' },
    { value: 'out', label: 'Stock Out', description: 'Remove inventory (damage, theft, waste)' },
    { value: 'adjustment', label: 'Adjustment', description: 'Correct inventory count' },
  ];

  const getReasonPlaceholder = () => {
    switch (formData.type) {
      case 'in': return 'e.g., Purchase from supplier, Customer return';
      case 'out': return 'e.g., Damaged goods, Theft, Expired items';
      case 'adjustment': return 'e.g., Stock count correction, System error';
      default: return 'Enter reason for stock movement';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onCancel}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {editingMovement ? 'Edit Stock Movement' : 'Record Stock Movement'}
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                Product *
              </label>
              <select
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Current: {product.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Movement Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {movementTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {movementTypes.find(t => t.value === formData.type)?.description}
              </p>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {selectedProduct && formData.type === 'adjustment' && (
                <p className="text-xs text-gray-500 mt-1">
                  Current stock: {selectedProduct.quantity}. Enter the correct quantity.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., PO-001, INV-123"
              />
            </div>

            {formData.type === 'in' && (
              <>
                <div>
                  <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  <select
                    id="supplierId"
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Cost (GHS)
                  </label>
                  <input
                    type="number"
                    id="unitCost"
                    name="unitCost"
                    value={formData.unitCost}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason *
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={getReasonPlaceholder()}
            />
          </div>

          {formData.type === 'in' && totalCost > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Cost Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Cost:</span>
                  <span className="font-medium">{formatCurrency(formData.unitCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{formData.quantity}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-semibold text-gray-900">Total Cost:</span>
                  <span className="font-bold text-primary-600 text-lg">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedProduct}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Record Movement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockMovementForm;