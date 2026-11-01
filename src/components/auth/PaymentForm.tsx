import React from 'react';
import ManualPaymentForm from '../ManualPaymentForm';
import type { SubscriptionPlan } from '../../types/subscription';

interface PaymentFormProps {
  selectedPlan: SubscriptionPlan;
  onBack: () => void;
  onPaymentComplete: () => void;
  signupData?: {
    email: string;
    businessName: string;
    ownerName: string;
  };
}

const PaymentForm: React.FC<PaymentFormProps> = ({ selectedPlan, onBack, onPaymentComplete, signupData }) => {
  return (
    <ManualPaymentForm
      selectedPlan={selectedPlan}
      onBack={onBack}
      onPaymentSubmitted={onPaymentComplete}
      signupData={signupData}
    />
  );
};

export default PaymentForm;