import React, { useState, useEffect } from 'react';
import { X, Crown, Check, Loader, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import ManualPaymentForm from './ManualPaymentForm';
import type { SubscriptionPlan } from '../types/subscription';

interface SubscriptionModalProps {
  onClose: () => void;
  paidPlansOnly?: boolean; // New prop to show only paid plans for renewals
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, paidPlansOnly = false }) => {
  const { refreshStatus } = useSubscription();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [paidPlansOnly]);

  const fetchPlans = async () => {
    try {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .neq('id', 'trial')
        .order('price', { ascending: true });

      // If paidPlansOnly is true, only show plans with price > 0
      if (paidPlansOnly) {
        query = query.gt('price', 0);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPlans(data || []);
      
      // Auto-select the first paid plan
      const firstPaidPlan = data?.find(plan => plan.price > 0);
      if (firstPaidPlan) {
        setSelectedPlan(firstPaidPlan);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmitted = async () => {
    // Refresh subscription status
    await refreshStatus();
    
    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full">
          <div className="text-center">
            <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4 text-primary-600" />
            <p className="text-gray-600 text-sm sm:text-base">Loading subscription plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-4">
      <div className="bg-white rounded-2xl max-w-sm sm:max-w-md lg:max-w-4xl w-full max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mx-1 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
            <div className="w-6 h-6 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Crown className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-2xl font-bold text-gray-900 truncate">
                {paidPlansOnly ? 'Renew Subscription' : 'Upgrade Plan'}
              </h2>
              <p className="text-xs text-gray-600 hidden sm:block">
                {paidPlansOnly ? 'Choose a plan to renew your subscription' : 'Choose the perfect plan for your business'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 border border-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Close Button */}
        <div className="block sm:hidden px-4 pt-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center font-medium"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {!showPayment ? (
            <>
              {/* Plan Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {plans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const isPopular = plan.popular;

                  return (
                    <div
                      key={plan.id}
                      className={`relative bg-white rounded-xl border-2 p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        isSelected
                          ? 'border-primary-500 shadow-lg ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <div className="bg-primary-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                            Most Popular
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-4 sm:mb-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <div className="mb-2">
                          <span className="text-2xl sm:text-3xl font-bold text-gray-900">GHS {plan.price}</span>
                          <span className="text-sm sm:text-base text-gray-600">/{plan.interval}</span>
                        </div>
                        {plan.interval === 'year' && (
                          <div className="text-green-600 text-xs sm:text-sm font-medium">Save 17%</div>
                        )}
                      </div>

                      <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2 sm:space-x-3">
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 text-xs sm:text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="text-center">
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mx-auto transition-colors ${
                            isSelected
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white m-0.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <h4 className="font-semibold text-blue-900 mb-3 sm:mb-4 flex items-center space-x-2 text-sm sm:text-base">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Payment Method: MTN Mobile Money</span>
                </h4>
                <div className="bg-white rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">MTN Mobile Money</p>
                      <p className="text-xs sm:text-sm text-gray-600">Pay securely with your MTN Mobile Money account</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs sm:text-sm text-gray-600 space-y-1">
                    <p><strong>Account:</strong> 0530745911 (DENNIS TETTEH ABAYATEYE)</p>
                    <p><strong>Process:</strong> Send payment → Get transaction ID → Submit for approval</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  {paidPlansOnly ? 'Cancel' : 'Maybe Later'}
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  disabled={!selectedPlan}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Upgrade to {selectedPlan?.name || 'Selected Plan'}</span>
                </button>
              </div>
            </>
          ) : (
            /* Payment Section */
            selectedPlan && (
              <ManualPaymentForm
                selectedPlan={selectedPlan}
                onBack={() => setShowPayment(false)}
                onPaymentSubmitted={handlePaymentSubmitted}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;