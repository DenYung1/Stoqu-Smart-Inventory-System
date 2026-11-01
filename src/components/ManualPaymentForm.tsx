import React, { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { SubscriptionPlan } from '../types/subscription';

interface ManualPaymentFormProps {
  selectedPlan: SubscriptionPlan;
  onBack: () => void;
  onPaymentSubmitted: () => void;
  signupData?: {
    email: string;
    businessName: string;
    ownerName: string;
  };
}

const ManualPaymentForm: React.FC<ManualPaymentFormProps> = ({ 
  selectedPlan, 
  onBack, 
  onPaymentSubmitted,
  signupData 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    transactionId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(12); // 12 seconds countdown

  const momoNumber = '0530745911';
  const momoName = 'DENNIS TETTEH ABAYATEYE';

  // Countdown effect for success message
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      onPaymentSubmitted();
    }
  }, [success, countdown, onPaymentSubmitted]);

  const handleContinue = () => {
    onPaymentSubmitted();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.transactionId.trim()) {
        throw new Error('Transaction ID is required');
      }

      const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
      if (authUserError || !authUserData.user) {
        throw new Error('Please sign in before submitting a payment request');
      }

      const paymentUser = user ?? authUserData.user;

      // For existing users and newly created paid accounts
      if (paymentUser) {
        // Submit payment request to database
        const { error: insertError } = await supabase
          .from('payment_requests')
          .insert({
            user_id: paymentUser.id,
            plan_id: selectedPlan.id,
            transaction_id: formData.transactionId.trim(),
            amount: selectedPlan.price,
            currency: selectedPlan.currency,
            payment_method: 'mtn_momo',
            status: 'pending',
            user_email: paymentUser.email || '',
            user_business_name: paymentUser.user_metadata?.business_name || 'Unknown Business',
            plan_name: selectedPlan.name,
          });

        if (insertError) {
          throw insertError;
        }
      } else {
        throw new Error('Please sign in before submitting a payment request');
      }

      setSuccess(true);
      setCountdown(12); // Reset countdown when showing success message

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (success) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
          <p className="text-gray-600 text-sm sm:text-base px-2">
            Your payment request has been submitted successfully and is now pending approval.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h4 className="font-medium text-emerald-900 mb-3 text-sm sm:text-base">What happens next?</h4>
          <div className="text-left space-y-2 text-xs sm:text-sm text-emerald-800">
            <div className="flex items-start space-x-2">
              <span className="font-semibold">1.</span>
              <span>Our team will verify your MTN Mobile Money transaction</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-semibold">2.</span>
              {signupData ? (
                <span>Your account will be created and subscription activated once approved</span>
              ) : (
                <span>You'll receive an email notification once approved (usually within 24 hours)</span>
              )}
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-semibold">3.</span>
              {signupData ? (
                <span>You'll receive login credentials and can start using the app immediately</span>
              ) : (
                <span>Your subscription will be activated immediately after approval</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Payment Details</h4>
          <div className="text-xs sm:text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">GHS {selectedPlan.price}</span>
            </div>
            <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-medium break-all">{formData.transactionId}</span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 px-2 mb-6">
          {signupData ? (
            'Your account will be created once payment is approved. You will receive an email with login instructions.'
          ) : (
            'You can continue using your trial while we process your payment.'
          )}
        </p>

        {/* Continue button and countdown */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleContinue}
            className="w-full sm:w-auto bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Continue
          </button>
          
          <div className="text-sm text-gray-500">
            Auto-continuing in <span className="font-medium text-primary-600">{countdown}</span> seconds
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
        <button
          onClick={onBack}
          className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent mb-1 sm:mb-2">Complete Payment</h2>
          <p className="text-gray-600 text-sm sm:text-base">Pay via MTN Mobile Money to upgrade your subscription</p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Order Summary</h3>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700 text-sm sm:text-base">{selectedPlan.name}</span>
          <span className="font-semibold text-sm sm:text-base">GHS {selectedPlan.price}</span>
        </div>
        {selectedPlan.interval === 'year' && (
          <div className="flex justify-between items-center mb-2 text-xs sm:text-sm">
            <span className="text-green-600">Annual discount (17% off)</span>
            <span className="text-green-600">-GHS {Math.round(selectedPlan.price * 0.17)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between items-center font-semibold text-base sm:text-lg">
            <span>Total</span>
            <span>GHS {selectedPlan.price}</span>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-emerald-900 mb-3 text-sm sm:text-base">MTN Mobile Money Payment Instructions</h3>
            
            <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-emerald-800">
              <div>
                <p className="font-medium mb-2">Step 1: Send Money via MTN Mobile Money</p>
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-emerald-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Phone Number:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm">{momoNumber}</span>
                        <button
                          onClick={() => copyToClipboard(momoNumber)}
                          className="text-emerald-600 hover:text-emerald-700 transition-colors p-1"
                        >
                          {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Name:</span>
                      <span className="font-mono text-xs sm:text-sm text-right">{momoName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Amount:</span>
                      <span className="font-mono text-sm sm:text-lg font-bold text-green-600">GHS {selectedPlan.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Step 2: Get Your Transaction ID</p>
                <p>After sending the money, you'll receive an SMS confirmation with a transaction ID. It usually looks like: <span className="font-mono bg-white px-1 rounded break-all">MP240101.1234.A12345</span></p>
              </div>

              <div>
                <p className="font-medium mb-2">Step 3: Enter Transaction ID Below</p>
                <p>Copy the transaction ID from your SMS and paste it in the form below to complete your upgrade.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 sm:space-x-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="text-red-800 font-medium text-sm sm:text-base">Payment Error</h4>
            <p className="text-red-700 text-xs sm:text-sm mt-1 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Enter Transaction Details</h4>
          
          <div>
            <label htmlFor="transactionId" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              MTN Mobile Money Transaction ID *
            </label>
            <input
              type="text"
              id="transactionId"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleChange}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
              placeholder="e.g., MP240101.1234.A12345"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the exact transaction ID from your MTN Mobile Money SMS confirmation
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 flex items-start space-x-2 sm:space-x-3">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-green-900 text-sm sm:text-base">Secure Payment Processing</h4>
            <p className="text-xs sm:text-sm text-green-800">
              Your payment will be manually verified by our team. We only collect the transaction ID for verification purposes.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !formData.transactionId.trim()}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 sm:py-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-lg flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {loading ? (
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Submit Payment - GHS {selectedPlan.price}</span>
            </>
          )}
        </button>

        <p className="text-center text-xs sm:text-sm text-gray-600 px-2">
          By submitting this payment, you agree to our Terms of Service and Privacy Policy.
          Your subscription will be activated once payment is verified.
        </p>
      </form>
    </div>
  );
};

export default ManualPaymentForm;