import React, { useState } from 'react';
import { Crown, Clock, Settings, AlertTriangle, CreditCard } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionModal from './SubscriptionModal';
import BillingManagementModal from './BillingManagementModal';

const SubscriptionWidget: React.FC = () => {
  const {
    subscription,
    plan,
    isTrialActive,
    isSubscriptionActive,
    daysRemaining,
    hoursRemaining,
    hasAccess,
    loading,
    subscriptionType,
    nextBillingDate,
    renewalAmount
  } = useSubscription();

  const [showModal, setShowModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription || !plan) {
    return null;
  }

  const getStatusColor = () => {
    if (!hasAccess) return 'text-red-600 bg-red-50 border-red-200';
    if (isTrialActive && daysRemaining <= 1) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (isTrialActive) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (isSubscriptionActive && daysRemaining <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (!hasAccess) return <AlertTriangle className="w-4 h-4" />;
    if (isTrialActive) return <Clock className="w-4 h-4" />;
    if (isSubscriptionActive) return <Crown className="w-4 h-4" />;
    return <Crown className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!hasAccess) return 'Expired';
    
    if (isTrialActive) {
      if (daysRemaining > 0) {
        return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;
      } else {
        return `${hoursRemaining}h ${Math.max(0, 60 - new Date().getMinutes())}m left`;
      }
    }
    
    if (isSubscriptionActive) {
      if (daysRemaining > 0) {
        return `Renews in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
      } else {
        return `Renews in ${hoursRemaining}h`;
      }
    }
    
    return 'Active';
  };

  const getSubscriptionTypeLabel = () => {
    switch (subscriptionType) {
      case 'trial': return 'Trial';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Annual';
      default: return '';
    }
  };

  return (
    <>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-gray-900">Subscription</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <p className="font-medium text-gray-900">{plan.name}</p>
              {subscriptionType !== 'trial' && (
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                  {getSubscriptionTypeLabel()}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              GHS {plan.price}{plan.price > 0 ? `/${plan.interval}` : ''}
            </p>
          </div>

          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>

          {/* Next billing info for active subscriptions */}
          {isSubscriptionActive && nextBillingDate && (
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Next billing:</span>
                <span className="font-medium">
                  {new Date(nextBillingDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Amount:</span>
                <span className="font-medium">GHS {renewalAmount}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {isTrialActive && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Upgrade Now
            </button>
          )}

          {!hasAccess && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Reactivate
            </button>
          )}

          {isSubscriptionActive && (
            <button
              onClick={() => setShowBillingModal(true)}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Manage Billing</span>
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <SubscriptionModal onClose={() => setShowModal(false)} paidPlansOnly={false} />
      )}

      {showBillingModal && (
        <BillingManagementModal onClose={() => setShowBillingModal(false)} />
      )}
    </>
  );
};

export default SubscriptionWidget;