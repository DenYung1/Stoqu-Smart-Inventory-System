export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  trialDays?: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  trial_start?: string;
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  type: 'momo' | 'card' | 'bank_transfer';
  provider?: string;
  last_four?: string;
  is_default: boolean;
}

export interface BillingInfo {
  nextBillingDate: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  daysUntilBilling: number;
  hoursUntilBilling: number;
  minutesUntilBilling: number;
}