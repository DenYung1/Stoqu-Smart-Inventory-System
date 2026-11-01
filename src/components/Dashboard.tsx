import React from 'react';
import { TrendingUp, Package, AlertTriangle, DollarSign, Calendar, TrendingDown, Crown } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionWidget from './SubscriptionWidget';
import type { DashboardStats, Product, Sale } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  products: Product[];
  recentSales: Sale[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, products, recentSales }) => {
  const { hasAccess, isTrialActive } = useSubscription();
  const lowStockProducts = products.filter(product => product.quantity <= product.minStock);
  
  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'blue',
      trend: '+12%'
    },
    {
      title: 'Today\'s Sales',
      value: formatCurrency(stats.todaySales),
      icon: TrendingUp,
      color: 'green',
      trend: '+15%'
    },
    {
      title: 'This Week\'s Sales',
      value: formatCurrency(stats.weekSales),
      icon: DollarSign,
      color: 'primary',
      trend: '+8%'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems.toString(),
      icon: AlertTriangle,
      color: 'red',
      trend: '-5%'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-ghana-green to-primary-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Stoqu</h2>
            <p className="text-green-100">
              {isTrialActive 
                ? 'You\'re currently on a 7-day free trial. Upgrade to unlock all features!'
                : 'Your smart inventory management companion'
              }
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-green-100">
            <Calendar className="w-5 h-5" />
            <span>{new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Better mobile layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            green: 'from-green-500 to-green-600',
            primary: 'from-primary-500 to-primary-600',
            red: 'from-red-500 to-red-600'
          };
          
          return (
            <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm font-medium truncate">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                    <span className="text-green-600 text-xs sm:text-sm font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <div className="xl:col-span-2">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Low Stock Alert</h3>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            
            {!hasAccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Subscription Required</p>
                <p className="text-sm text-gray-400">Upgrade to monitor low stock alerts</p>
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">All products are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-semibold">{product.quantity} left</p>
                      <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{lowStockProducts.length - 5} more items need restocking
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Subscription Widget and Recent Sales */}
        <div className="space-y-6">
          {/* Subscription Widget */}
          <SubscriptionWidget />

          {/* Recent Sales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            
            {!hasAccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Subscription Required</p>
                <p className="text-sm text-gray-400">Upgrade to track sales</p>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8">
                <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sales recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{sale.productName}</p>
                      <p className="text-sm text-gray-600">
                        {sale.quantity} × {formatCurrency(sale.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(sale.totalAmount)}</p>
                      <p className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;