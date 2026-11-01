import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, Clock, CheckCircle, AlertCircle, Crown, RefreshCw } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PaymentRequest } from '../types/payment';
import SubscriptionModal from './SubscriptionModal';

interface BillingManagementModalProps {
  onClose: () => void;
}

const BillingManagementModal: React.FC<BillingManagementModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { 
    plan, 
    subscriptionType, 
    nextBillingDate, 
    renewalAmount, 
    daysRemaining,
    hasAccess,
    refreshStatus,
    clearCache
  } = useSubscription();
  const [paymentHistory, setPaymentHistory] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<PaymentRequest[]>([]);

  // Check if subscription is expired
  const isExpired = !hasAccess && user;
  const hasPendingPayment = pendingPayments.length > 0;

  useEffect(() => {
    fetchPaymentHistory();
  }, [user]);

  const fetchPaymentHistory = async () => {
    if (!user) return;

    try {
      console.log('Fetching payment history for user:', user.id);
      
      // Fetch approved payments (payment history)
      const { data: approvedData, error: approvedError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (approvedError) {
        console.error('Error fetching approved payments:', approvedError);
      } else {
        console.log('Approved payments found:', approvedData?.length || 0);
        setPaymentHistory(approvedData || []);
      }

      // Fetch pending payments
      const { data: pendingData, error: pendingError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error fetching pending payments:', pendingError);
      } else {
        console.log('Pending payments found:', pendingData?.length || 0);
        setPendingPayments(pendingData || []);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = () => {
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionModalClose = () => {
    setShowSubscriptionModal(false);
    // Clear cache and refresh subscription status after modal closes to check for updates
    if (clearCache) {
      clearCache();
    }
    refreshStatus();
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    // Clear cache to ensure fresh data
    if (clearCache) {
      clearCache();
    }
    await refreshStatus();
    await fetchPaymentHistory();
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mx-1 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
            <div className="w-6 h-6 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-2xl font-bold text-gray-900 truncate">Billing</h2>
              <p className="text-xs text-gray-600 hidden sm:block">Manage your subscription and billing</p>
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
        <div className="p-4 sm:p-6 space-y-6">
          {/* Current Subscription */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Current Subscription</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700 mb-1">Plan</p>
                <p className="font-semibold text-blue-900">{plan?.name || 'Active Plan'}</p>
              </div>
              
              <div>
                <p className="text-sm text-blue-700 mb-1">Billing Cycle</p>
                <p className="font-semibold text-blue-900 capitalize">
                  {subscriptionType === 'yearly' ? 'Annual' : 'Monthly'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-blue-700 mb-1">Next Billing Date</p>
                <p className="font-semibold text-blue-900">
                  {nextBillingDate ? formatDate(nextBillingDate) : 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-blue-700 mb-1">Next Payment</p>
                <p className="font-semibold text-blue-900">GHS {renewalAmount || '0'}</p>
              </div>
            </div>

            {daysRemaining !== undefined && (
              <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">{daysRemaining}</span> day{daysRemaining !== 1 ? 's' : ''} until next billing
                </p>
              </div>
            )}
          </div>

          {/* Subscription Expired Banner */}
          {isExpired && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Subscription Expired</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Your subscription has expired. To continue accessing all features and your business data, please submit a manual payment for admin approval.
                  </p>
                  
                  {/* Show pending payment status if available */}
                  {hasPendingPayment ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-800">Payment Submitted - Awaiting Approval</span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Your payment has been submitted and is being reviewed by our admin team. You'll be notified once approved.
                      </p>
                    </div>
                  ) : null}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Manual Payment Process:</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Make payment via MTN Mobile Money to: <strong>0530745911</strong></li>
                      <li>• Submit your transaction ID through the renewal form</li>
                      <li>• Admin will review and approve within 24 hours</li>
                      <li>• Access will be restored immediately after approval</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handleRenewSubscription}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                      disabled={hasPendingPayment}
                    >
                      <Crown className="w-4 h-4" />
                      <span>{hasPendingPayment ? 'Payment Pending' : 'Submit Manual Payment'}</span>
                    </button>
                    <button
                      onClick={handleRefreshStatus}
                      className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh Status</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payment History</span>
            </h3>

            {/* Pending Payments Section */}
            {pendingPayments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-yellow-800 mb-3 flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Pending Approval</span>
                </h4>
                <div className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-900">{payment.plan_name}</p>
                          <p className="text-sm text-yellow-700">
                            {formatDate(payment.created_at)} • Transaction: {payment.transaction_id}
                          </p>
                          <p className="text-xs text-yellow-600">
                            Awaiting admin approval - typically processed within 24 hours
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-yellow-900">
                          GHS {payment.amount}
                        </p>
                        <p className="text-sm text-yellow-600 capitalize">{payment.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Payments Section */}
            {paymentHistory.length > 0 && (
              <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Approved Payments</span>
              </h4>
            )}
            
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading payment history...</p>
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(payment.status)}
                      <div>
                        <p className="font-medium text-gray-900">{payment.plan_name}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(payment.created_at)} • Transaction: {payment.transaction_id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        GHS {payment.amount}
                      </p>
                      <p className="text-sm text-green-600 capitalize">{payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No payment history found</p>
              </div>
            )}
          </div>

          {/* Payment Information */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-gray-900">MTN Mobile Money</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account</span>
                <span className="font-medium text-gray-900">0530745911</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Auto-renewal</span>
                <span className="font-medium text-gray-900">Manual Payment Required</span>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• For billing questions, contact our support team</p>
              <p>• Payments are processed manually within 24 hours</p>
              <p>• You'll receive email notifications for payment updates</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal onClose={handleSubscriptionModalClose} paidPlansOnly={true} />
      )}
    </div>
  );
};

export default BillingManagementModal;
