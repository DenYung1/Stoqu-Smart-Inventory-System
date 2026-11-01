import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminUser } from '../utils/adminAccess';
import AuthPage from './auth/AuthPage';
import AdminRoute from './admin/AdminRoute';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-ghana-gold to-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Stoqu</h2>
          <p className="text-gray-600">Preparing your inventory management system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (isAdminUser(user)) {
    return <AdminRoute />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;