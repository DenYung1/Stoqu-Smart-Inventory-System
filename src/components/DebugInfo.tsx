import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../hooks/useUserData';
import { useSubscription } from '../hooks/useSubscription';

const DebugInfo: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    products, 
    sales, 
    dataLoading 
  } = useUserData();
  const { hasAccess, loading: subscriptionLoading } = useSubscription();

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div>Auth Loading: {authLoading ? 'Yes' : 'No'}</div>
      <div>User: {user?.email || 'None'}</div>
      <div>Data Loading: {dataLoading ? 'Yes' : 'No'}</div>
      <div>Subscription Loading: {subscriptionLoading ? 'Yes' : 'No'}</div>
      <div>Has Access: {hasAccess ? 'Yes' : 'No'}</div>
      <div>Products: {products.length}</div>
      <div>Sales: {sales.length}</div>
    </div>
  );
};

export default DebugInfo;
