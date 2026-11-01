import React, { useState } from 'react';
import { Crown, AlertTriangle, LogOut } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionModal from './SubscriptionModal';

interface TrialExpiredModalProps {
  onClose?: () => void; // Optional since this modal shouldn't be dismissible
}

const TrialExpiredModal: React.FC<TrialExpiredModalProps> = () => {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { refreshStatus, clearCache } = useSubscription();
  const { signOut } = useAuth();

  const handleUpgradeClick = () => {
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionModalClose = () => {
    setShowSubscriptionModal(false);
    // Clear cache and refresh status to check if user upgraded
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

  return (
    <>
      {/* Modal Backdrop - blocks entire app */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto sm:overflow-hidden">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto my-4 sm:my-0">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Trial Expired</h2>
            <p className="text-red-100">
              Your free trial has ended
            </p>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-4">
                To continue using Stoqu and access all your business data, please choose a subscription plan.
              </p>
              
              {/* Benefits List */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center justify-center">
                  <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                  What you'll get:
                </h4>
                <ul className="text-sm text-gray-700 space-y-2 text-left">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Unlimited products and sales tracking
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
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleUpgradeClick}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg"
              >
                <Crown className="w-5 h-5" />
                <span>Choose Subscription Plan</span>
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
                Your data is safe and will be restored immediately after subscription
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal onClose={handleSubscriptionModalClose} paidPlansOnly={false} />
      )}
    </>
  );
};

export default TrialExpiredModal;
