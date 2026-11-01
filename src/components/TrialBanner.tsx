import React, { useState } from 'react';
import { Clock, Crown, ArrowRight, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionModal from './SubscriptionModal';
import BillingManagementModal from './BillingManagementModal';

const TrialBanner: React.FC = () => {
  const { 
    isTrialActive, 
    isSubscriptionActive, 
    daysRemaining, 
    hoursRemaining, 
    minutesRemaining,
    hasAccess,
    plan,
    subscriptionType,
    nextBillingDate,
    renewalAmount,
    loading // Add loading state to prevent flash
  } = useSubscription();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Don't show banner if still loading
  if (loading) {
    return null;
  }

  // Trial expired - only show if we're sure the subscription status has loaded
  if (!hasAccess && !isSubscriptionActive && !loading) {
    return (
      <div className="border-b border-red-200 text-red-700 shadow-sm relative z-10 mt-4">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-xs sm:text-sm">Your trial has expired</p>
                <p className="text-xs opacity-70">
                  Subscribe now to continue using Stoqu
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="border border-red-300 text-red-600 px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm w-full sm:w-auto"
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Subscribe Now</span>
            </button>
          </div>
        </div>
        
        {showUpgradeModal && (
          <SubscriptionModal onClose={() => setShowUpgradeModal(false)} paidPlansOnly={false} />
        )}
      </div>
    );
  }

  // Active trial
  if (isTrialActive) {
    const isUrgent = daysRemaining <= 1;
    const textColor = isUrgent ? 'text-orange-700' : 'text-primary-700';
    const borderColor = isUrgent ? 'border-orange-200' : 'border-primary-200';

    return (
      <div className={`border-b ${borderColor} ${textColor} shadow-sm relative z-10 mt-4`}>
        <div className="px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="font-semibold text-xs sm:text-sm">
                  {plan?.name || 'Free Trial'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                {daysRemaining > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="font-bold">{daysRemaining}</span>
                    <span>day{daysRemaining !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {(daysRemaining === 0 || daysRemaining === 1) && (
                  <div className="flex items-center space-x-1">
                    <span className="font-bold">{hoursRemaining}</span>
                    <span>hour{hoursRemaining !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {daysRemaining === 0 && hoursRemaining < 2 && (
                  <div className="flex items-center space-x-1">
                    <span className="font-bold">{minutesRemaining}</span>
                    <span>min{minutesRemaining !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                <span className="opacity-70">remaining</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="border border-primary-300 text-primary-600 px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm w-full sm:w-auto"
              >
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Upgrade Now</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {showUpgradeModal && (
          <SubscriptionModal onClose={() => setShowUpgradeModal(false)} paidPlansOnly={false} />
        )}
      </div>
    );
  }

  // Active paid subscription - show billing countdown
  if (isSubscriptionActive && nextBillingDate) {
    const isNearRenewal = daysRemaining <= 7;
    const textColor = isNearRenewal ? 'text-blue-700' : 'text-green-700';
    const borderColor = isNearRenewal ? 'border-blue-200' : 'border-green-200';

    return (
      <div className={`border-b ${borderColor} ${textColor} shadow-sm relative z-10 mt-4`}>
        <div className="px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4" />
                <span className="font-semibold text-xs sm:text-sm">
                  {plan?.name || 'Active Subscription'}
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {subscriptionType === 'yearly' ? 'Annual' : 'Monthly'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Renews in</span>
                </div>
                
                {daysRemaining > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="font-bold">{daysRemaining}</span>
                    <span>day{daysRemaining !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {daysRemaining === 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="font-bold">{hoursRemaining}</span>
                    <span>hour{hoursRemaining !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                <span className="opacity-70">
                  for GHS {renewalAmount}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBillingModal(true)}
                className="border border-gray-300 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1 text-xs sm:text-sm w-full sm:w-auto"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Manage</span>
              </button>
            </div>
          </div>
        </div>
        
        {showBillingModal && (
          <BillingManagementModal onClose={() => setShowBillingModal(false)} />
        )}
      </div>
    );
  }

  return null;
};

export default TrialBanner;