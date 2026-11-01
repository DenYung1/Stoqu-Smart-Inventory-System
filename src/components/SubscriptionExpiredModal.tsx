import React, { useState } from 'react';
import { CreditCard, AlertTriangle, Clock, LogOut } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionModal from './SubscriptionModal';

interface SubscriptionExpiredModalProps {
  onClose?: () => void; // Optional since this modal shouldn't be dismissible
}

const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = () => {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { refreshStatus, clearCache, subscriptionType, plan } = useSubscription();
  const { signOut } = useAuth();

  const handleRenewClick = () => {
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionModalClose = () => {
    setShowSubscriptionModal(false);
    // Clear cache and refresh status to check if user renewed
    if (clearCache) {
      clearCache();
    }
    refreshStatus();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Determine subscription type for display
  const isMonthly = subscriptionType === 'monthly';
  const isYearly = subscriptionType === 'yearly';
  const planName = plan?.name || (isMonthly ? 'Monthly' : isYearly ? 'Yearly' : 'Subscription');

  return (
    <>
      {/* Modal Backdrop - blocks entire app */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Subscription Expired</h2>
            <p className="text-orange-100">
              Your {planName} subscription has ended
            </p>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-4">
                To continue using Stoqu and access all your business data, please renew your subscription.
              </p>
              
              {/* Benefits List */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                  Renew to continue enjoying:
                </h4>
                <ul className="text-sm text-gray-700 space-y-2 text-left">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    All your saved products and sales data
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Advanced analytics and reporting
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Supplier management
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Cloud backup and sync across devices
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Priority customer support
                  </li>
                </ul>
              </div>
              
              {/* Urgency Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Your business data is safely stored and will be immediately accessible upon renewal.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleRenewClick}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg"
              >
                <CreditCard className="w-5 h-5" />
                <span>Renew Subscription</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
              
              {/* Small print */}
              <p className="text-xs text-gray-500 text-center">
                Choose the same plan or upgrade to continue where you left off
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal onClose={handleSubscriptionModalClose} paidPlansOnly={true} />
      )}
    </>
  );
};

export default SubscriptionExpiredModal;
