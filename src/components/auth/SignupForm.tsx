import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Building, UserPlus, AlertCircle, CheckCircle, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SubscriptionSelector from './SubscriptionSelector';
import PaymentForm from './PaymentForm';
import type { SubscriptionPlan } from '../../types/subscription';
import { getTrialPlan } from '../../data/subscriptionPlans';
import { validateEmailSecurity, normalizeEmail } from '../../utils/emailSecurity';
import { validatePasswordStrength } from '../../utils/passwordPolicy';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

type SignupStep = 'account' | 'subscription' | 'payment' | 'success';

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { signUp, signOut, user } = useAuth();
  const [currentStep, setCurrentStep] = useState<SignupStep>('account');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(getTrialPlan() || null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    ownerName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  // Auto-redirect countdown when signup is successful
  useEffect(() => {
    if (currentStep === 'success' && user) {
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, user]);

  // Email validation and warning
  useEffect(() => {
    if (formData.email) {
      const emailValidation = validateEmailSecurity(formData.email);
      if (!emailValidation.isValid) {
        setEmailWarning(emailValidation.error || null);
      } else {
        // Check if it's a Gmail address with dots
        const normalizedEmail = normalizeEmail(formData.email);
        if (formData.email.includes('@gmail.com') && formData.email !== normalizedEmail) {
          setEmailWarning(
            `Note: Gmail treats "${formData.email}" and "${normalizedEmail}" as the same address. ` +
            `If you already have an account, please sign in instead.`
          );
        } else {
          setEmailWarning(null);
        }
      }
    } else {
      setEmailWarning(null);
    }
  }, [formData.email]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const emailValidation = validateEmailSecurity(formData.email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || null);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordValidation = validatePasswordStrength(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Password is invalid');
      return;
    }

    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return;
    }

    if (!formData.ownerName.trim()) {
      setError('Owner name is required');
      return;
    }

    setCurrentStep('subscription');
  };

  const handleSubscriptionContinue = async () => {
    if (!selectedPlan) return;
    
    if (selectedPlan.id === 'trial' || selectedPlan.price === 0) {
      // For trial, proceed directly to account creation
      handleFinalSignup();
    } else {
      // Create the account before payment so the password never enters payment records.
      setLoading(true);
      setError(null);
      try {
        await signUp(formData.email, formData.password, formData.businessName, formData.ownerName, false);
        setCurrentStep('payment');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Account creation failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePaymentComplete = async () => {
    // For paid plans, payment submission completes the signup process
    // Account creation will happen when admin approves the payment
    await signOut();
    setCurrentStep('success');
  };

  const handleFinalSignup = async () => {
    setLoading(true);
    
    try {
      await signUp(formData.email, formData.password, formData.businessName, formData.ownerName);
      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      setCurrentStep('account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Navigation functions
  const goToAccountStep = () => {
    setCurrentStep('account');
    setError(null);
  };

  const goToSubscriptionStep = () => {
    setCurrentStep('subscription');
    setError(null);
  };

  // Progress Steps
  const steps = [
    { id: 'account', label: 'Account', completed: currentStep !== 'account' },
    { id: 'subscription', label: 'Plan', completed: ['payment', 'success'].includes(currentStep) },
    { id: 'payment', label: 'Payment', completed: currentStep === 'success' },
  ];

  if (currentStep === 'success') {
    return (
      <div className="w-full max-w-md text-center px-2 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {selectedPlan && selectedPlan.id !== 'trial' && selectedPlan.price > 0 ? 'Payment Submitted!' : 'Welcome to Stoqu!'}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            {selectedPlan && selectedPlan.id !== 'trial' && selectedPlan.price > 0 
              ? 'Your payment has been submitted and is pending admin approval.'
              : 'Your account has been created successfully and you\'re now signed in. Your 7-day free trial has started!'
            }
          </p>
        </div>

        {selectedPlan && selectedPlan.id !== 'trial' && selectedPlan.price > 0 ? (
          /* Paid Plan Success */
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h4 className="font-medium text-yellow-900 mb-2">⏳ Payment Approval Pending</h4>
              <p className="text-sm text-yellow-800">
                Your account is ready. Full plan access will be enabled once our team approves your payment, typically within 24 hours.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Our team will verify your MTN Mobile Money payment</p>
                <p>• Your existing account will be upgraded to {selectedPlan?.name}</p>
                <p>• You can sign in while your payment is being reviewed</p>
                <p>• You can start using the app immediately after approval</p>
              </div>
            </div>

            <div className="text-center text-xs sm:text-sm text-gray-600">
              <p>Thank you for choosing Stoqu! We'll notify you as soon as your account is ready.</p>
            </div>
          </>
        ) : (
          /* Trial Success */
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h4 className="font-medium text-green-900 mb-2">🎉 You're all set!</h4>
              <p className="text-sm text-green-800">
                You can now start managing your inventory, tracking sales, and growing your business with Stoqu.
                <span className="block mt-1 font-medium">
                  Your 7-day trial gives you full access to all features!
                </span>
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-emerald-800 font-medium text-sm sm:text-base">Redirecting to your dashboard...</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-700">
                You'll be redirected automatically in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="text-center text-xs sm:text-sm text-gray-600">
              <p>If you're not redirected automatically, the dashboard will appear once you're fully signed in.</p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Progress Indicator - Mobile Optimized Horizontal */}
      <div className="flex items-center justify-center mb-4 sm:mb-6 lg:mb-8 px-3 sm:px-4">
        {/* Mobile & Desktop: Horizontal layout that spans full width */}
        <div className="flex items-center justify-between w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg relative">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
              {/* Step Circle */}
              <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-200 mb-1.5 sm:mb-2 ${
                step.completed || currentStep === step.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.completed ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> : index + 1}
              </div>
              
              {/* Step Label */}
              <span className={`text-xs sm:text-sm md:text-base font-medium transition-colors duration-200 text-center leading-tight ${
                step.completed || currentStep === step.id ? 'text-emerald-600' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
          
          {/* Connection Lines - Positioned between circles */}
          {steps.slice(0, -1).map((step, index) => (
            <div 
              key={`line-${index}`}
              className={`absolute h-0.5 sm:h-1 transition-all duration-200 ${
                step.completed ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gray-200'
              }`}
              style={{ 
                top: '14px', // Position at center of circles
                left: `${((index + 1) * 100) / steps.length}%`,
                width: `${100 / steps.length}%`,
                transform: 'translateX(-50%)',
                zIndex: 0
              }}
            />
          ))}
        </div>
      </div>

      {/* Account Creation Step */}
      {currentStep === 'account' && (
        <div className="max-w-md mx-auto">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent mb-2">
              Create Your Account
            </h2>
            <p className="text-gray-600 font-light text-sm sm:text-base">Start your journey with smart inventory management</p>
          </div>

          {error && (
            <div className="mb-3 sm:mb-4 lg:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-red-800 font-medium text-sm sm:text-base">Signup Error</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                {error.includes('already exists') && (
                  <p className="text-red-600 text-xs mt-2">
                    This might be due to email variations (like dots in Gmail addresses) being treated as the same account.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleAccountSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Mobile: Single column, Desktop: Two columns for name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <div className="relative">
                  <Building className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-emerald-50/30 hover:bg-white text-sm sm:text-base touch-manipulation"
                    placeholder="Your business name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    id="ownerName"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-emerald-50/30 hover:bg-white text-sm sm:text-base touch-manipulation"
                    placeholder="Your full name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-emerald-50/30 hover:bg-white text-sm sm:text-base touch-manipulation"
                  placeholder="Enter your email"
                />
              </div>
              {emailWarning && (
                <div className={`mt-2 p-3 rounded-xl border ${
                  emailWarning.includes('Note:') 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start space-x-2">
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      emailWarning.includes('Note:') ? 'text-yellow-600' : 'text-red-500'
                    }`} />
                    <p className={`text-xs ${
                      emailWarning.includes('Note:') ? 'text-yellow-800' : 'text-red-700'
                    }`}>
                      {emailWarning}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-3 sm:py-3.5 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-emerald-50/30 hover:bg-white text-sm sm:text-base touch-manipulation"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50 touch-manipulation"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-3 sm:py-3.5 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-emerald-50/30 hover:bg-white text-sm sm:text-base touch-manipulation"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50 touch-manipulation"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 sm:py-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-medium touch-manipulation"
            >
              <UserPlus className="w-5 h-5" />
              <span>Continue to Plan Selection</span>
            </button>
          </form>

          <div className="mt-4 sm:mt-6 lg:mt-8 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors touch-manipulation"
              >
                Sign in here
              </button>
            </p>
          </div>

          {/* Email Security Notice */}
          <div className="mt-3 sm:mt-4 lg:mt-6 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-xl">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-emerald-900 mb-1 text-sm sm:text-base">Email Security</h4>
                <p className="text-xs text-emerald-800">
                  We prevent duplicate accounts by treating email variations as the same address. 
                  For Gmail, addresses like "john.doe@gmail.com" and "johndoe@gmail.com" are considered identical.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Selection Step */}
      {currentStep === 'subscription' && (
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Back to Account Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <button
              onClick={goToAccountStep}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base p-2 rounded-lg hover:bg-gray-50 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Account Details</span>
            </button>
            
            {/* Account Summary */}
            <div className="text-left sm:text-right bg-gray-50 p-3 rounded-lg sm:bg-transparent sm:p-0">
              <p className="text-xs sm:text-sm text-gray-600">Creating account for:</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{formData.businessName}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{formData.email}</p>
            </div>
          </div>

          <SubscriptionSelector
            selectedPlan={selectedPlan}
            onPlanSelect={setSelectedPlan}
            onContinue={handleSubscriptionContinue}
          />
        </div>
      )}

      {/* Payment Step */}
      {currentStep === 'payment' && selectedPlan && (
        <div className="space-y-4 sm:space-y-6">
          {/* Back to Subscription Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <button
              onClick={goToSubscriptionStep}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base p-2 rounded-lg hover:bg-gray-50 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Plan Selection</span>
            </button>
            
            {/* Account Summary */}
            <div className="text-left sm:text-right bg-gray-50 p-3 rounded-lg sm:bg-transparent sm:p-0">
              <p className="text-xs sm:text-sm text-gray-600">Account:</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{formData.businessName}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{formData.email}</p>
            </div>
          </div>

          <PaymentForm
            selectedPlan={selectedPlan}
            onBack={goToSubscriptionStep}
            onPaymentComplete={handlePaymentComplete}
            signupData={{
              email: formData.email,
              businessName: formData.businessName,
              ownerName: formData.ownerName
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SignupForm;