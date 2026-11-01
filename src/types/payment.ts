export interface PaymentRequest {
  id: string;
  user_id: string | null;
  plan_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  payment_method: 'mtn_momo';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
  user_email: string;
  user_business_name: string;
  plan_name: string;
  signup_data?: {
    email: string;
    business_name: string;
    owner_name: string;
  };
}

export interface PaymentFormData {
  transactionId: string;
  amount: number;
  planId: string;
}