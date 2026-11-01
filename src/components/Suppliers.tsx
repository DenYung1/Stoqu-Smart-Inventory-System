import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, Phone, Mail, MapPin } from 'lucide-react';
import type { Supplier } from '../types';
import SupplierForm from './SupplierForm';

interface SuppliersProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSupplier: (id: string, supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteSupplier: (id: string) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.includes(searchTerm)
  );

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleSubmit = (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingSupplier) {
      onUpdateSupplier(editingSupplier.id, supplierData);
    } else {
      onAddSupplier(supplierData);
    }
    setShowForm(false);
    setEditingSupplier(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
  };

  if (showForm) {
    return (
      <SupplierForm
        supplier={editingSupplier}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Suppliers</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-primary-700 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact person, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Suppliers Found</h3>
          <p className="text-gray-600 mb-6">
            {suppliers.length === 0 
              ? "Add your suppliers to track purchases and manage relationships."
              : "No suppliers match your search criteria."
            }
          </p>
          {suppliers.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
            >
              Add Your First Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{supplier.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{supplier.contactPerson}</p>
                </div>
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Edit supplier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteSupplier(supplier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Delete supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-900 break-all">{supplier.phone}</span>
                </div>
                
                {supplier.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 break-all">{supplier.email}</span>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-900 break-words">{supplier.address}</span>
                  </div>
                )}

                {supplier.paymentTerms && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600 font-medium mb-1">Payment Terms</p>
                    <p className="text-sm text-gray-900 break-words">{supplier.paymentTerms}</p>
                  </div>
                )}

                {supplier.notes && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Notes</p>
                    <p className="text-sm text-gray-900 break-words">{supplier.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suppliers;