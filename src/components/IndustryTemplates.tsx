import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Clock, CheckCircle, Package, ArrowRight, Users, Star } from 'lucide-react';

interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  business_type: string;
  product_count: number;
  estimated_setup_time: string;
  is_featured: boolean;
}

interface TemplateProduct {
  id: string;
  master_product_id: string;
  suggested_markup_percent: number;
  is_essential: boolean;
  display_order: number;
  master_product: {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    standard_price: number;
    unit: string;
    brand?: string;
  };
}

interface IndustryTemplatesProps {
  onSelectTemplate: (template: IndustryTemplate, products: TemplateProduct[]) => void;
  onClose: () => void;
}

const IndustryTemplates: React.FC<IndustryTemplatesProps> = ({ onSelectTemplate, onClose }) => {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [templateProducts, setTemplateProducts] = useState<TemplateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('industry_templates')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('product_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateProducts = async (templateId: string) => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('template_products')
        .select(`
          *,
          master_product:master_products(*)
        `)
        .eq('template_id', templateId)
        .order('display_order');

      if (error) throw error;
      setTemplateProducts(data || []);
    } catch (error) {
      console.error('Error fetching template products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleTemplateClick = async (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    await fetchTemplateProducts(template.id);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && templateProducts.length > 0) {
      onSelectTemplate(selectedTemplate, templateProducts);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.business_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = filterIndustry === 'all' || template.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  const industries = [...new Set(templates.map(t => t.industry))];

  const calculateTotalValue = () => {
    return templateProducts.reduce((total, item) => {
      const basePrice = item.master_product.standard_price;
      const markup = basePrice * (item.suggested_markup_percent / 100);
      return total + basePrice + markup;
    }, 0);
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case 'beauty': return '💄';
      case 'pharmacy': return '🏥';
      case 'electronics': return '📱';
      case 'grocery': return '🛒';
      case 'automotive': return '🚗';
      case 'office': return '📋';
      case 'pet': return '🐕';
      case 'sports': return '⚽';
      case 'baby': return '👶';
      case 'restaurant': return '🍽️';
      default: return '📦';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading industry templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Industry Quick-Start Templates</h2>
                <p className="text-purple-100">Get your inventory up and running in minutes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-purple-100 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Template List */}
          <div className="w-1/2 border-r border-gray-200 overflow-hidden flex flex-col">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>
                    {getIndustryIcon(industry)} {industry.charAt(0).toUpperCase() + industry.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getIndustryIcon(template.industry)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            {template.name}
                            {template.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                          </h3>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {template.product_count} products
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {template.estimated_setup_time}
                        </span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {template.business_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Template Details */}
          <div className="w-1/2 overflow-hidden flex flex-col">
            {selectedTemplate ? (
              <>
                {/* Template Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{getIndustryIcon(selectedTemplate.industry)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {selectedTemplate.name}
                        {selectedTemplate.is_featured && <Star className="h-5 w-5 text-yellow-500 fill-current" />}
                      </h3>
                      <p className="text-gray-600">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <Package className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-800">{selectedTemplate.product_count}</div>
                      <div className="text-xs text-gray-500">Products</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-800">{selectedTemplate.estimated_setup_time}</div>
                      <div className="text-xs text-gray-500">Setup Time</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-800">${calculateTotalValue().toFixed(0)}</div>
                      <div className="text-xs text-gray-500">Est. Value</div>
                    </div>
                  </div>

                  <button
                    onClick={handleUseTemplate}
                    disabled={loadingProducts || templateProducts.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Use This Template
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Products List */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingProducts ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading products...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 mb-4">Included Products</h4>
                      {templateProducts.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 border rounded-lg ${
                            item.is_essential ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-gray-800">{item.master_product.name}</h5>
                                {item.is_essential && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    Essential
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {item.master_product.category} → {item.master_product.subcategory}
                              </p>
                              {item.master_product.brand && (
                                <p className="text-xs text-gray-500">Brand: {item.master_product.brand}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-800">
                                ${(item.master_product.standard_price * (1 + item.suggested_markup_percent / 100)).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">
                                +{item.suggested_markup_percent}% markup
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a template to view details</p>
                  <p className="text-sm">Choose from our curated industry-specific product collections</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryTemplates;
