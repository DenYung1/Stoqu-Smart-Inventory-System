import React, { useState } from 'react';
import { Check, Star, CreditCard, Smartphone, Building } from 'lucide-react';
import { subscriptionPlans } from '../../data/subscriptionPlans';
import type { SubscriptionPlan } from '../../types/subscription';

interface SubscriptionSelectorProps {
  selectedPlan: SubscriptionPlan | null;
  onPlanSelect: (plan: SubscriptionPlan) => void;
  onContinue: () => void;
}

const SubscriptionSelector: React.FC<SubscriptionSelectorProps> = ({
  selectedPlan,
  onPlanSelect,
  onContinue
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  const filteredPlans = subscriptionPlans.filter(plan => {
    if (plan.id === 'trial') return true;
    if (billingCycle === 'monthly') return plan.interval === 'month';
    return plan.interval === 'year';
  });

  const getSavings = (plan: SubscriptionPlan) => {
    if (plan.interval === 'year') {
      const monthlyEquivalent = subscriptionPlans.find(p => 
        p.name.includes(plan.name.split(' ')[0]) && p.interval === 'month'
      );
      if (monthlyEquivalent) {
        const yearlyMonthly = monthlyEquivalent.price * 12;
        const savings = ((yearlyMonthly - plan.price) / yearlyMonthly * 100).toFixed(0);
        return `Save ${savings}%`;
      }
    }
    return null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Start with a free trial or select a plan that fits your business</p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredPlans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          const isPopular = plan.popular;
          const isTrial = plan.id === 'trial';
          const savings = getSavings(plan);

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-200'
                  : 'border-gray-200 hover:border-emerald-300'
              } ${isTrial ? 'bg-gradient-to-br from-green-50 to-emerald-50' : ''}`}
              onClick={() => onPlanSelect(plan)}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              {/* Trial Badge */}
              {isTrial && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Free Trial
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price === 0 ? 'Free' : `GHS ${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600">/{plan.interval}</span>
                  )}
                </div>
                {savings && (
                  <div className="text-green-600 text-sm font-medium">{savings}</div>
                )}
                {isTrial && (
                  <div className="text-green-600 text-sm font-medium">
                    Then GHS 29/month
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selection Indicator */}
              <div className="text-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 mx-auto transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white m-0.5" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Methods Info */}
      {selectedPlan && selectedPlan.price > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
          <h4 className="font-semibold text-emerald-900 mb-4 flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Accepted Payment Methods</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 bg-white rounded-lg p-3">
              <Smartphone className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-medium text-gray-900">Mobile Money</p>
                <p className="text-sm text-gray-600">MTN, Vodafone, AirtelTigo</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white rounded-lg p-3">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-medium text-gray-900">Credit/Debit Cards</p>
                <p className="text-sm text-gray-600">Visa, Mastercard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white rounded-lg p-3">
              <Building className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-medium text-gray-900">Bank Transfer</p>
                <p className="text-sm text-gray-600">All major banks</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="text-center">
        <button
          onClick={onContinue}
          disabled={!selectedPlan}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {selectedPlan?.id === 'trial' ? 'Start Free Trial' : 'Continue to Payment'}
        </button>
        
        {selectedPlan?.id === 'trial' && (
          <p className="text-sm text-gray-600 mt-2">
            No credit card required • Cancel anytime
          </p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSelector;