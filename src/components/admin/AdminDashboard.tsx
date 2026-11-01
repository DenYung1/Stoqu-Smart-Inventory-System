import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { supabase, adminSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminDashboardClient } from '../../utils/adminDashboardClient';
import type { PaymentRequest } from '../../types/payment';

type TabType = 'payments' | 'users';

interface UserProfile {
  id: string;
  email: string;
  business_name: string;
  created_at: string;
  last_login_at: string | null;
  is_banned: boolean;
  banned_at: string | null;
  banned_by: string | null;
  ban_reason: string | null;
  subscription?: {
    status: 'trial' | 'active' | 'cancelled' | 'expired';
    current_period_end: string;
    trial_end?: string;
  };
}

const MobileUserCard = ({ user, onBan, onUnban }: { 
  user: UserProfile;
  onBan: () => void;
  onUnban: () => void;
}) => (
  <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="mb-3 flex items-start justify-between">
      <div className="flex-1">
        <h3 className="truncate text-sm font-semibold text-slate-900">{user.email}</h3>
        <p className="truncate text-xs text-slate-500">{user.business_name}</p>
      </div>
      <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        user.is_banned
          ? 'bg-rose-100 text-rose-700'
          : 'bg-emerald-100 text-emerald-700'
      }`}>
        {user.is_banned ? 'Banned' : 'Active'}
      </span>
    </div>
    <div className="flex items-center justify-between text-xs text-slate-500">
      <div>
        <p>Joined: {new Date(user.created_at).toLocaleString('en-GB', { 
          timeZone: 'UTC',
          dateStyle: 'medium',
          timeStyle: 'short'
        })}</p>
        <p>Last Login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-GB', {
          timeZone: 'UTC',
          dateStyle: 'medium',
          timeStyle: 'short'
        }) : 'Never'}</p>
        {user.subscription && (
          <p>Subscription End: {new Date(user.subscription.current_period_end).toLocaleString('en-GB', {
            timeZone: 'UTC',
            dateStyle: 'medium',
            timeStyle: 'short'
          })}</p>
        )}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={user.is_banned ? onUnban : onBan}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
            user.is_banned
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {user.is_banned ? 'Unban' : 'Ban'}
        </button>
      </div>
    </div>
  </div>
);

const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const getSupabaseErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

const AdminDashboard: React.FC = () => {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [showExtendTrialModal, setShowExtendTrialModal] = useState(false);
  const [showExtendSubscriptionModal, setShowExtendSubscriptionModal] = useState(false);
  const [extensionDays, setExtensionDays] = useState('7');
  const dashboardClient = getAdminDashboardClient(adminSupabase, supabase);

  const runUserAction = async (
    userId: string,
    action: () => Promise<{ error: { message: string } | null }>,
    successMessage: string
  ) => {
    setProcessing(userId);
    try {
      const { error } = await action();
      if (error) throw error;
      alert(successMessage);
      await fetchUsers();
    } catch (error) {
      console.error('Admin action failed:', error);
      alert(error instanceof Error ? error.message : 'The admin action failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const approvePayment = async (request: PaymentRequest) => {
    if (!dashboardClient) {
      alert('Admin actions are unavailable. Please check the Supabase configuration.');
      return;
    }

    setProcessing(request.id);
    try {
      const { data, error } = await dashboardClient.rpc('approve_payment_request', {
        request_id: request.id,
        admin_id: 'admin',
      });
      if (error) throw error;
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error('error' in data && typeof data.error === 'string' ? data.error : 'Payment approval failed.');
      }
      await fetchPaymentRequests();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert(getSupabaseErrorMessage(error, 'Failed to approve payment. Please try again.'));
    } finally {
      setProcessing(null);
    }
  };

  const rejectPayment = async () => {
    if (!dashboardClient || !selectedRequest || !rejectionReason.trim()) return;

    setProcessing(selectedRequest.id);
    try {
      const { data, error } = await dashboardClient.rpc('reject_payment_request', {
        request_id: selectedRequest.id,
        rejection_reason: rejectionReason.trim(),
        admin_id: 'admin',
      });
      if (error) throw error;
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error('error' in data && typeof data.error === 'string' ? data.error : 'Payment rejection failed.');
      }
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchPaymentRequests();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert(getSupabaseErrorMessage(error, 'Failed to reject payment. Please try again.'));
    } finally {
      setProcessing(null);
    }
  };

  const banUser = async () => {
    if (!selectedUser || !banReason.trim() || !dashboardClient) return;
    await runUserAction(
      selectedUser.id,
      () => dashboardClient.from('profiles').update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_by: user?.id && isValidUUID(user.id) ? user.id : null,
        ban_reason: banReason.trim(),
      }).eq('id', selectedUser.id),
      'User banned successfully.'
    );
    setShowBanModal(false);
    setSelectedUser(null);
    setBanReason('');
  };

  const unbanUser = async () => {
    if (!selectedUser || !dashboardClient) return;
    await runUserAction(
      selectedUser.id,
      () => dashboardClient.from('profiles').update({
        is_banned: false,
        banned_at: null,
        banned_by: null,
        ban_reason: null,
      }).eq('id', selectedUser.id),
      'User unbanned successfully.'
    );
    setShowUnbanModal(false);
    setSelectedUser(null);
  };

  const extendSubscription = async () => {
    if (!selectedUser?.subscription || !dashboardClient) return;
    const days = Number(extensionDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      alert('Enter a number of days between 1 and 365.');
      return;
    }
    const currentEnd = new Date(selectedUser.subscription.current_period_end);
    const start = Math.max(Date.now(), currentEnd.getTime());
    const periodEnd = new Date(start + days * 24 * 60 * 60 * 1000).toISOString();
    await runUserAction(
      selectedUser.id,
      () => dashboardClient.from('user_subscriptions').update({
        current_period_end: periodEnd,
        status: 'active',
      }).eq('user_id', selectedUser.id),
      'Subscription extended successfully.'
    );
    setShowExtendSubscriptionModal(false);
    setSelectedUser(null);
    setExtensionDays('7');
  };

  const extendTrial = async () => {
    if (!selectedUser?.subscription || !dashboardClient) return;
    const days = Number(extensionDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      alert('Enter a number of days between 1 and 365.');
      return;
    }
    const currentEnd = selectedUser.subscription.trial_end
      ? new Date(selectedUser.subscription.trial_end)
      : new Date();
    const trialEnd = new Date(Math.max(Date.now(), currentEnd.getTime()) + days * 24 * 60 * 60 * 1000).toISOString();
    await runUserAction(
      selectedUser.id,
      () => dashboardClient.from('user_subscriptions').update({
        trial_end: trialEnd,
        current_period_end: trialEnd,
        status: 'trial',
      }).eq('user_id', selectedUser.id),
      'Trial extended successfully.'
    );
    setShowExtendTrialModal(false);
    setSelectedUser(null);
    setExtensionDays('7');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // The AuthProvider will handle redirecting to login
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  useEffect(() => {
    fetchPaymentRequests();
    
    // Set up real-time subscription for payment requests
    const subscription = supabase
      .channel('payment_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
        },
        () => {
          fetchPaymentRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchPaymentRequests();
    }
  }, [activeTab]);

  const fetchPaymentRequests = async () => {
    if (!dashboardClient) {
      return;
    }

    try {
      const { data, error } = await dashboardClient
        .from('payment_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      // Silent fail - security notice is shown at top of dashboard
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!dashboardClient) {
      console.error('Admin functionality is not available');
      return;
    }

    try {
      setLoading(true);
      
      // Get the current admin user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserId = currentUser?.id && isValidUUID(currentUser.id) ? currentUser.id : null;
      
      // Get all user profiles
      let profilesQuery = dashboardClient
        .from('profiles')
        .select('*');

      if (currentUserId) {
        profilesQuery = profilesQuery.neq('id', currentUserId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery.order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      console.log('Profiles loaded successfully');

      const { data: loginRecords, error: loginRecordsError } = await dashboardClient.rpc(
        'get_admin_user_last_logins'
      );

      if (loginRecordsError) {
        console.error('Error fetching user login times:', loginRecordsError);
        throw loginRecordsError;
      }

      const lastLoginByUserId = new Map(
        (loginRecords ?? []).map(loginRecord => [loginRecord.user_id, loginRecord.last_login_at])
      );

      // Get all subscriptions
      const { data: subscriptions, error: subscriptionsError } = await dashboardClient
        .from('user_subscriptions')
        .select('*');

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        throw subscriptionsError;
      }
      console.log('Subscriptions loaded successfully');

      // Combine the data
      const usersWithLogin = profiles.map(user => {
        const userSubscription = subscriptions.find(sub => sub.user_id === user.id);
        return {
          ...user,
          last_login_at: lastLoginByUserId.get(user.id) ?? user.last_login_at ?? null,
          subscription: userSubscription ? {
            status: userSubscription.status,
            trial_end: userSubscription.trial_end,
            current_period_end: userSubscription.current_period_end
          } : null
        };
      });

      setUsers(usersWithLogin);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setUsers([]);
      alert('Failed to fetch users. Please check your admin access.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = paymentRequests.filter(request => {
    const matchesSearch = 
      request.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = userStatusFilter === 'all' || 
      (userStatusFilter === 'banned' && user.is_banned) ||
      (userStatusFilter === 'active' && !user.is_banned);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: paymentRequests.length,
    pending: paymentRequests.filter(r => r.status === 'pending').length,
    approved: paymentRequests.filter(r => r.status === 'approved').length,
    rejected: paymentRequests.filter(r => r.status === 'rejected').length,
    totalRevenue: paymentRequests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.amount, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="font-medium text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Admin Dashboard</h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Manage payments, subscriptions, and user access in one place.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.location.reload()
                }
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-[73px] z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <nav className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setActiveTab('payments')}
              className={`${
                activeTab === 'payments'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              } whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center space-x-2`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="hidden sm:inline">Payment Requests</span>
              <span className="sm:hidden">Payments</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              } whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center space-x-2`}
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'payments' ? (
          // Existing payment requests content
          <div>
            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0 mx-auto sm:mx-0">
                    <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-slate-500 sm:text-sm">Total Requests</p>
                    <p className="text-lg font-bold text-slate-900 sm:text-2xl">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0 mx-auto sm:mx-0">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-slate-500 sm:text-sm">Pending</p>
                    <p className="text-lg font-bold text-slate-900 sm:text-2xl">{stats.pending}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0 mx-auto sm:mx-0">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-slate-500 sm:text-sm">Approved</p>
                    <p className="text-lg font-bold text-slate-900 sm:text-2xl">{stats.approved}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0 mx-auto sm:mx-0">
                    <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-slate-500 sm:text-sm">Rejected</p>
                    <p className="text-lg font-bold text-slate-900 sm:text-2xl">{stats.rejected}</p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:col-span-1 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0 mx-auto sm:mx-0">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-primary-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-slate-500 sm:text-sm">Revenue</p>
                    <p className="text-lg font-bold text-slate-900 sm:text-2xl">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                  <input
                    type="text"
                    placeholder="Search by email, business name, or transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:py-2 sm:pl-10 sm:text-base touch-manipulation"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-slate-400 sm:h-5 sm:w-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-2 sm:text-base touch-manipulation"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Requests - Mobile Cards & Desktop Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                              <span>{request.user_business_name}</span>
                              {!request.user_id && request.signup_data && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                  New Signup
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{request.user_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{request.plan_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(request.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {request.transaction_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="capitalize">{request.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approvePayment(request)}
                                disabled={processing === request.id}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {processing === request.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                                disabled={processing === request.id}
                                className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <span className="text-gray-400">
                              {request.processed_at && new Date(request.processed_at).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="border-b border-slate-200 last:border-b-0">
                    <div className="p-4 space-y-3">
                      {/* Header with status */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {request.user_business_name}
                            </h3>
                            {!request.user_id && request.signup_data && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                New Signup
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{request.user_email}</p>
                        </div>
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status}</span>
                        </div>
                      </div>

                      {/* Plan and Amount */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Plan</p>
                          <p className="text-sm font-medium text-gray-900">{request.plan_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(request.amount)}</p>
                        </div>
                      </div>

                      {/* Transaction ID */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                        <div className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded break-all">
                          {request.transaction_id}
                        </div>
                      </div>

                      {/* Date and Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-xs text-gray-500">Submitted</p>
                          <p className="text-sm text-gray-900">{new Date(request.submitted_at).toLocaleDateString()}</p>
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => approvePayment(request)}
                              disabled={processing === request.id}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectModal(true);
                              }}
                              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {request.status !== 'pending' && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Processed</p>
                            <p className="text-sm text-gray-900">
                              {request.processed_at && new Date(request.processed_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRequests.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Payment Requests</h3>
                  <p className="text-gray-600 text-sm sm:text-base px-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No requests match your search criteria.'
                      : 'No payment requests have been submitted yet.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // User Management content
          <div>
            {/* Search and Filter */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex w-full flex-col items-stretch space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                <div className="relative flex-1 sm:flex-none">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-4 transition-colors focus:border-indigo-500 focus:ring-indigo-500 sm:w-64"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                </div>
                <div className="relative">
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as 'all' | 'active' | 'banned')}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 transition-colors focus:border-indigo-500 focus:ring-indigo-500 sm:w-auto"
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </select>
                  <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* User List - Mobile view */}
            <div className="block sm:hidden">
              {filteredUsers.map((user) => (
                <MobileUserCard
                  key={user.id}
                  user={user}
                  onBan={() => {
                    setSelectedUser(user);
                    setShowBanModal(true);
                  }}
                  onUnban={() => {
                    setSelectedUser(user);
                    setShowUnbanModal(true);
                  }}
                />
              ))}
            </div>

            {/* User List - Desktop view */}
            <div className="hidden sm:block">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">{user.business_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_banned
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.is_banned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.subscription ? (
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.subscription.status === 'trial'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : user.subscription.status === 'active'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.subscription.status.charAt(0).toUpperCase() + user.subscription.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                Ends: {new Date(user.subscription.current_period_end).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No subscription</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-GB', {
                            timeZone: 'UTC',
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                if (user.is_banned) {
                                  setShowUnbanModal(true);
                                } else {
                                  setShowBanModal(true);
                                }
                              }}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium text-white transition-colors ${
                                user.is_banned ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                              }`}
                            >
                              {user.is_banned ? 'Unban' : 'Ban'}
                            </button>
                            {user.subscription && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  if (user.subscription?.status === 'trial') {
                                    setShowExtendTrialModal(true);
                                  } else {
                                    setShowExtendSubscriptionModal(true);
                                  }
                                }}
                                className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                              >
                                Extend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredUsers.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900">No Users Found</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {searchTerm || userStatusFilter !== 'all'
                    ? 'No users match your current filters.'
                    : 'No user accounts are available yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ban User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to ban {selectedUser.email}? This will prevent them from accessing the application.
            </p>
            <div className="mb-4">
              <label htmlFor="banReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for ban (required)
              </label>
              <textarea
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={banUser}
                disabled={!banReason.trim() || processing === selectedUser.id}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {processing === selectedUser.id ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban User Modal */}
      {showUnbanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Unban User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to unban {selectedUser.email}? This will restore their access to the application.
            </p>
            {selectedUser.ban_reason && (
              <div className="mb-4 rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium text-gray-700">Original ban reason:</p>
                <p className="text-sm text-gray-600 mt-1">{selectedUser.ban_reason}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUnbanModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={unbanUser}
                disabled={processing === selectedUser.id}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {processing === selectedUser.id ? 'Unbanning...' : 'Unban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal - Mobile Optimized */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Reject Payment Request</h3>
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
              Please provide a reason for rejecting this payment from {selectedRequest.user_business_name}:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Invalid transaction ID, Amount mismatch, etc."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4 text-sm sm:text-base touch-manipulation resize-none"
              rows={3}
            />
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={rejectPayment}
                disabled={!rejectionReason.trim() || processing === selectedRequest.id}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
              >
                {processing === selectedRequest.id ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Trial Modal */}
      {showExtendTrialModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Extend Trial Period</h3>
            <p className="text-sm text-gray-600 mb-4">
              Extend the trial period for {selectedUser.email}. Current trial ends on{' '}
              {selectedUser.subscription?.trial_end && new Date(selectedUser.subscription.trial_end).toLocaleString('en-GB', {
                timeZone: 'UTC',
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
            <div className="mb-4">
              <label htmlFor="extensionDays" className="block text-sm font-medium text-gray-700">
                Number of Days to Extend
              </label>
              <input
                type="number"
                id="extensionDays"
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="1"
                max="365"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowExtendTrialModal(false);
                  setSelectedUser(null);
                  setExtensionDays('7');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={extendTrial}
                disabled={processing === selectedUser.id}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
              >
                {processing === selectedUser.id ? 'Extending...' : 'Extend Trial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Subscription Modal */}
      {showExtendSubscriptionModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Extend Subscription Period</h3>
            <p className="text-sm text-gray-600 mb-4">
              Extend the subscription period for {selectedUser.email}. Current subscription ends on{' '}
              {selectedUser.subscription?.current_period_end && new Date(selectedUser.subscription.current_period_end).toLocaleString('en-GB', {
                timeZone: 'UTC',
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
            <div className="mb-4">
              <label htmlFor="extensionDays" className="block text-sm font-medium text-gray-700">
                Number of Days to Extend
              </label>
              <input
                type="number"
                id="extensionDays"
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="1"
                max="365"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowExtendSubscriptionModal(false);
                  setSelectedUser(null);
                  setExtensionDays('7');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={extendSubscription}
                disabled={processing === selectedUser.id}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {processing === selectedUser.id ? 'Extending...' : 'Extend Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;