import React, { useState, useEffect } from 'react';
import { Search, Package, Plus, ArrowLeft, Zap } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface MasterProduct {
  id: string;
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  sku_pattern?: string;
  standard_price?: number;
  description?: string;
  barcode?: string;
  image_url?: string;
  tags?: string[];
  industry?: string[];
}

interface ProductCatalogProps {
  onSelectProduct: (catalogProduct: MasterProduct, customData: { cost: number; price: number; quantity: number; minStock: number }) => void;
  onCancel: () => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ onSelectProduct, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(null);
  const [customData, setCustomData] = useState({
    cost: 0,
    price: 0,
    quantity: 1,
    minStock: 5
  });

  const supabase = getSupabaseClient();

  // Load master products catalog
  useEffect(() => {
    const loadMasterProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('master_products')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (error) {
        console.error('Error loading master products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMasterProducts();
  }, []);

  // Filter products based on search and filters
  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (selectedIndustry) {
      filtered = filtered.filter(product => 
        product.industry?.includes(selectedIndustry)
      );
    }

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, selectedIndustry, products]);

  const categories = [...new Set(products.map(p => p.category))];
  const industries = [...new Set(products.flatMap(p => p.industry || []))];

  const handleProductSelect = (product: MasterProduct) => {
    setSelectedProduct(product);
    // Set suggested price based on standard price with markup
    if (product.standard_price) {
      setCustomData(prev => ({
        ...prev,
        cost: product.standard_price! * 0.7, // Suggest 70% as cost
        price: product.standard_price! // Use standard price as selling price
      }));
    }
  };

  const handleAddProduct = () => {
    if (selectedProduct && customData.price > 0) {
      onSelectProduct(selectedProduct, customData);
    }
  };

  const handleCustomDataChange = (field: keyof typeof customData, value: number) => {
    setCustomData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span>Loading product catalog...</span>
          </div>
        </div>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Add Product</h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            {/* Product Preview */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                  {selectedProduct.brand && (
                    <p className="text-sm text-gray-600">Brand: {selectedProduct.brand}</p>
                  )}
                  <p className="text-sm text-gray-600">Category: {selectedProduct.category}</p>
                  {selectedProduct.standard_price && (
                    <p className="text-sm text-green-600">Ref. Price: GHS {selectedProduct.standard_price.toFixed(2)}</p>
                  )}
                </div>
              </div>
              {selectedProduct.description && (
                <p className="text-sm text-gray-600 mt-3">{selectedProduct.description}</p>
              )}
            </div>

            {/* Custom Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Cost Price (GHS) *
                  </label>
                  <input
                    type="number"
                    value={customData.cost}
                    onChange={(e) => handleCustomDataChange('cost', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Selling Price (GHS) *
                  </label>
                  <input
                    type="number"
                    value={customData.price}
                    onChange={(e) => handleCustomDataChange('price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    value={customData.quantity}
                    onChange={(e) => handleCustomDataChange('quantity', parseInt(e.target.value) || 0)}
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Stock Level *
                  </label>
                  <input
                    type="number"
                    value={customData.minStock}
                    onChange={(e) => handleCustomDataChange('minStock', parseInt(e.target.value) || 0)}
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="5"
                  />
                </div>
              </div>

              {/* Profit Margin Display */}
              {customData.cost > 0 && customData.price > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profit Margin:</span>
                    <span className={`text-sm font-semibold ${
                      ((customData.price - customData.cost) / customData.price * 100) > 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {((customData.price - customData.cost) / customData.price * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profit per Item:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      GHS {(customData.price - customData.cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Catalog
              </button>
              <button
                onClick={handleAddProduct}
                disabled={customData.price <= 0}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Inventory</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
                <p className="text-gray-600">Choose from {products.length}+ pre-loaded products</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products, brands, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>
                  {industry.charAt(0).toUpperCase() + industry.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <Package className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="text-gray-900">{product.category}</span>
                    </div>
                    {product.standard_price && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ref. Price:</span>
                        <span className="text-green-600 font-semibold">GHS {product.standard_price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {product.tags && product.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {product.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {product.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-full">
                          +{product.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <button className="w-full mt-4 px-3 py-2 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    Select Product
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;
