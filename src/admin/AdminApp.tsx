import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import AdminRoute from '../components/admin/AdminRoute';

function AdminApp() {
  return (
    <AuthProvider>
      <AdminRoute />
    </AuthProvider>
  );
}

export default AdminApp;