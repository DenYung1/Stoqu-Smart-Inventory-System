import type { SubscriptionPlan } from '../types/subscription';

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'trial',
    name: '7-Day Free Trial',
    price: 0,
    currency: 'GHS',
    interval: 'month',
    trialDays: 7,
    features: [
      'Full access to all features',
      'Up to 100 products',
      'Basic analytics',
      'Email support',
      'No credit card required'
    ]
  },
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 29,
    currency: 'GHS',
    interval: 'month',
    popular: true,
    features: [
      'Unlimited products',
      'Advanced analytics',
      'Sales reporting',
      'Supplier management',
      'Low stock alerts',
      'Email & phone support',
      'Data export/import',
      'Cloud backup & sync'
    ]
  },
  {
    id: 'business',
    name: 'Business Plan',
    price: 49,
    currency: 'GHS',
    interval: 'month',
    features: [
      'Everything in Starter',
      'Multi-location support',
      'Advanced reporting',
      'Custom categories',
      'Priority support',
      'API access',
      'White-label options',
      'Advanced integrations'
    ]
  },
  {
    id: 'starter-yearly',
    name: 'Starter Plan (Yearly)',
    price: 290,
    currency: 'GHS',
    interval: 'year',
    features: [
      'Everything in monthly Starter',
      '2 months free (save 17%)',
      'Priority email support',
      'Quarterly business reviews',
      'Extended data retention'
    ]
  },
  {
    id: 'business-yearly',
    name: 'Business Plan (Yearly)',
    price: 490,
    currency: 'GHS',
    interval: 'year',
    features: [
      'Everything in monthly Business',
      '2 months free (save 17%)',
      'Dedicated account manager',
      'Custom integrations',
      'Advanced training sessions',
      'Priority feature requests'
    ]
  }
];

export const getPopularPlan = () => subscriptionPlans.find(plan => plan.popular);
export const getTrialPlan = () => subscriptionPlans.find(plan => plan.id === 'trial');
export const getStarterPlan = () => subscriptionPlans.find(plan => plan.id === 'starter');
export const getPaidPlans = () => subscriptionPlans.filter(plan => plan.price > 0);