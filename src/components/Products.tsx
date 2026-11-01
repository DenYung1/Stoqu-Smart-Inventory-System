import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Zap, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import type { Product, Supplier } from '../types';
import ProductForm from './ProductForm';
import ProductCatalog from './ProductCatalog';
import IndustryTemplates from './IndustryTemplates';

interface CatalogProduct {
  name: string;
  sku_pattern?: string;
  brand?: string;
  category: string;
  standard_price?: number;
  subcategory?: string;
  unit?: string;
}

interface TemplateProduct {
  master_product: {
    name: string;
    category: string;
    standard_price: number;
    unit?: string;
    subcategory?: string;
    brand?: string;
  };
  suggested_markup_percent: number;
  is_essential: boolean;
}

interface ProductsProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddProductFromCatalog?: (catalogProduct: CatalogProduct, customData: { cost: number; price: number; quantity: number; minStock: number }) => void;
  onAddMultipleProducts?: (products: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onUpdateProduct: (id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteProduct: (id: string) => void;
}

const Products: React.FC<ProductsProps> = ({ products, suppliers, onAddProduct, onAddProductFromCatalog, onAddMultipleProducts, onUpdateProduct, onDeleteProduct }) => {
  const [showForm, setShowForm] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const categories = Array.from(new Set(products.map(product => product.category))).filter(Boolean);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      onUpdateProduct(editingProduct.id, productData);
    } else {
      onAddProduct(productData);
    }
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleCatalogSelect = (catalogProduct: CatalogProduct, customData: { cost: number; price: number; quantity: number; minStock: number }) => {
    if (onAddProductFromCatalog) {
      onAddProductFromCatalog(catalogProduct, customData);
    }
    setShowCatalog(false);
  };

  const handleCatalogCancel = () => {
    setShowCatalog(false);
  };

  const handleTemplateSelect = async (_template: unknown, templateProducts: TemplateProduct[]) => {
    if (onAddMultipleProducts) {
      // Convert template products to our product format
      const productsToAdd = templateProducts.map(item => {
        const basePrice = item.master_product.standard_price;
        const markup = basePrice * (item.suggested_markup_percent / 100);
        const sellingPrice = basePrice + markup;

        return {
          name: item.master_product.name,
          sku: `${item.master_product.category.substring(0, 3).toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          category: item.master_product.category,
          cost: basePrice,
          price: sellingPrice,
          quantity: 10, // Default initial stock
          minStock: item.is_essential ? 5 : 2,
          unit: item.master_product.unit || 'pcs',
          supplierId: '', // User can assign later
          description: `${item.master_product.subcategory} - ${item.master_product.brand || 'Generic'}`,
        };
      });

      onAddMultipleProducts(productsToAdd);
    }
    setShowTemplates(false);
  };

  const handleTemplateCancel = () => {
    setShowTemplates(false);
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return null;
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name;
  };

  const calculateProfitMargin = (price: number, cost: number) => {
    if (cost === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  if (showForm) {
    return (
      <ProductForm
        product={editingProduct}
        suppliers={suppliers}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );
  }

  if (showCatalog) {
    return (
      <ProductCatalog
        onSelectProduct={handleCatalogSelect}
        onCancel={handleCatalogCancel}
      />
    );
  }

  if (showTemplates) {
    return (
      <IndustryTemplates
        onSelectTemplate={handleTemplateSelect}
        onClose={handleTemplateCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          {onAddMultipleProducts && (
            <button
              onClick={() => setShowTemplates(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Quick Start</span>
            </button>
          )}
          {onAddProductFromCatalog && (
            <button
              onClick={() => setShowCatalog(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:from-purple-600 hover:to-purple-700 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Add from Catalog</span>
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search and Filter - Mobile optimized */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-600 mb-6">
            {products.length === 0 
              ? "Start by adding your first product to track inventory."
              : "No products match your search criteria."
            }
          </p>
          {products.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const supplierName = getSupplierName(product.supplierId);
            const profitMargin = calculateProfitMargin(product.price, product.cost);
            
            return (
              <div key={product.id} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base truncate">{product.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">SKU: {product.sku}</p>
                    <p className="text-xs sm:text-sm text-primary-600 font-medium">{product.category}</p>
                    {supplierName && (
                      <p className="text-xs text-gray-500 mt-1 truncate">Supplier: {supplierName}</p>
                    )}
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold">{formatCurrency(product.price)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${product.quantity <= product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.quantity}
                      </span>
                      {product.quantity <= product.minStock && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className={`font-semibold ${profitMargin > 0 ? 'text-green-600' : profitMargin < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                      {product.description}
                    </p>
                  )}
                </div>

                {product.quantity <= product.minStock && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 text-sm font-medium">Low Stock Alert</span>
                    </div>
                    <p className="text-red-600 text-xs mt-1">
                      Only {product.quantity} left (minimum: {product.minStock})
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Products;