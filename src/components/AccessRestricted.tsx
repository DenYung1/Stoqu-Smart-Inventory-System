import React, { useState } from 'react';
import { Lock, Crown, AlertTriangle, RefreshCw, Loader } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionModal from './SubscriptionModal';

interface AccessRestrictedProps {
  feature?: string;
  children?: React.ReactNode;
}

const AccessRestricted: React.FC<AccessRestrictedProps> = ({ 
  feature = 'this feature', 
  children 
}) => {
  const { hasAccess, isTrialActive, refreshStatus, loading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshStatus();
    setIsRefreshing(false);
  };

  // Show loading state while subscription status is being determined
  // Only show loading if we're actually loading (not just a brief flash)
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has access, render children immediately
  if (hasAccess) {
    return <>{children}</>;
  }

  // If no access, show restriction message
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isTrialActive ? 'Trial Expired' : 'Subscription Required'}
        </h2>

        <p className="text-gray-600 mb-6">
          {isTrialActive 
            ? `Your free trial has ended. Subscribe now to continue using ${feature} and access all your business data.`
            : `You need an active subscription to access ${feature}. Choose a plan that fits your business needs.`
          }
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Crown className="w-5 h-5" />
            <span>View Subscription Plans</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* Feature Benefits */}
        <div className="mt-8 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h4 className="font-medium text-emerald-900 mb-1">Why Subscribe?</h4>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>• Unlimited products and sales tracking</li>
                <li>• Advanced analytics and reporting</li>
                <li>• Supplier management</li>
                <li>• Data backup and sync</li>
                <li>• Priority customer support</li>
              </ul>
            </div>
          </div>
        </div>

        {showUpgradeModal && (
          <SubscriptionModal onClose={() => setShowUpgradeModal(false)} paidPlansOnly={false} />
        )}
      </div>
    </div>
  );
};

export default AccessRestricted;