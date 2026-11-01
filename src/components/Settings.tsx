import React, { useState } from 'react';
import { Save, Download, Upload, Building, Bell, Database, Shield, AlertTriangle, Trash2 } from 'lucide-react';
import type { Settings as SettingsType } from '../types';

interface SettingsProps {
  settings: SettingsType;
  onUpdateSettings: (settings: SettingsType) => void;
  onExportData: () => void;
  onImportData: (data: Record<string, unknown>) => void;
  onClearUserData: () => void;
  onSyncData: () => void;
  dataStats: {
    products: number;
    sales: number;
    suppliers: number;
    stockMovements: number;
  };
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onUpdateSettings, 
  onExportData, 
  onImportData, 
  onClearUserData,
  onSyncData,
  dataStats 
}) => {
  const [formData, setFormData] = useState(settings);
  const [activeTab, setActiveTab] = useState('business');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings(formData);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        const parentValue = prev[parent as keyof SettingsType];
        // Ensure the parent value is an object before spreading
        const parentObject = typeof parentValue === 'object' && parentValue !== null ? parentValue : {};
        
        return {
          ...prev,
          [parent]: {
            ...parentObject,
            [child]: type === 'checkbox' ? checked : value
          }
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          onImportData(data);
        } catch {
          alert('Invalid file format. Please select a valid JSON backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClearData = () => {
    if (window.confirm('⚠️ WARNING: This will permanently delete ALL your data including products, sales, suppliers, and settings. This action cannot be undone.\n\nAre you absolutely sure you want to continue?')) {
      if (window.confirm('This is your final confirmation. All your business data will be lost forever. Type "DELETE" in the next prompt to confirm.')) {
        const confirmation = prompt('Type "DELETE" to confirm data deletion:');
        if (confirmation === 'DELETE') {
          onClearUserData();
          alert('All data has been cleared. You now have a fresh start.');
        } else {
          alert('Data deletion cancelled.');
        }
      }
    }
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* Tab Navigation */}
      <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 sm:px-4 py-2 sm:py-2 rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition-colors flex-shrink-0 min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-base font-medium whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information */}
        {activeTab === 'business' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <Building className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter owner name"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+233 24 123 4567"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="business@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter full business address"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency || 'GHS'}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="GHS">Ghana Cedi (GHS)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">British Pound (GBP)</option>
                </select>
              </div>

              <div>
                <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  id="taxRate"
                  name="taxRate"
                  value={formData.taxRate || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="12.5"
                />
              </div>

              <div>
                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold || ''}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Low Stock Alerts</h4>
                  <p className="text-sm text-gray-600">Get notified when products are running low</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="notifications.lowStock"
                    checked={formData.notifications?.lowStock || false}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Daily Summary</h4>
                  <p className="text-sm text-gray-600">Receive daily sales and inventory summary</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="notifications.dailySummary"
                    checked={formData.notifications?.dailySummary || false}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Weekly Reports</h4>
                  <p className="text-sm text-gray-600">Get weekly business performance reports</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="notifications.weeklyReport"
                    checked={formData.notifications?.weeklyReport || false}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Auto Backup</h4>
                  <p className="text-sm text-gray-600">Automatically backup data weekly</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoBackup"
                    checked={formData.autoBackup || false}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
            </div>

            <div className="space-y-6">
              {/* Session Timeout Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Automatic Session Timeout</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      For your security, you will be automatically logged out after 20 minutes of inactivity. 
                      A warning will appear 5 minutes before logout.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-800">Session Duration:</span>
                        <span className="text-blue-700 ml-2">20 minutes</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Warning Time:</span>
                        <span className="text-blue-700 ml-2">5 minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Security Features</h4>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <h5 className="font-medium text-green-900">Session Timeout</h5>
                        <p className="text-sm text-green-700">Automatic logout after inactivity</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <h5 className="font-medium text-green-900">Secure Authentication</h5>
                        <p className="text-sm text-green-700">Email verification and secure passwords</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <h5 className="font-medium text-green-900">Data Encryption</h5>
                        <p className="text-sm text-green-700">All data encrypted in transit and at rest</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                  </div>
                </div>
              </div>

              {/* Security Tips */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-3">Security Tips</h4>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Always log out when using shared or public devices</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Use a strong, unique password for your account</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Keep your browser and device updated</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Don't share your login credentials with others</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Data Management */}
        {activeTab === 'data' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <Database className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
            </div>

            <div className="space-y-6">
              {/* Security Notice */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Data Security</h4>
                    <p className="text-sm text-blue-700">
                      Your data is stored securely and isolated per user account. Each user has their own private data space.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cross-Device Sync */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-start space-x-3">
                  <Database className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-emerald-900 mb-1">Cross-Device Sync</h4>
                    <p className="text-sm text-emerald-700 mb-3">
                      Your data is automatically synced across all devices. Use the manual sync button if you're experiencing sync issues.
                    </p>
                    <button
                      type="button"
                      onClick={onSyncData}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center space-x-2"
                    >
                      <Database className="w-4 h-4" />
                      <span>Manual Sync Now</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Export and Import Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Data */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export Data</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Download a complete backup of your business data including products, sales, suppliers, and settings.
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={onExportData}
                      className="w-full bg-primary-600 text-white px-4 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export All Data</span>
                    </button>
                    <p className="text-xs text-gray-500">
                      Exports as JSON file with timestamp and user info
                    </p>
                  </div>
                </div>

                {/* Import Data */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Import Data</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Restore your business data from a previously exported backup file.
                  </p>
                  <div className="space-y-2">
                    <label className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer border-2 border-dashed border-gray-300">
                      <Upload className="w-4 h-4" />
                      <span>Choose Backup File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      Accepts JSON files only
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Statistics */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Your Data Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary-600">{dataStats.products}</p>
                    <p className="text-xs text-gray-600">Products</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{dataStats.sales}</p>
                    <p className="text-xs text-gray-600">Sales</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{dataStats.suppliers}</p>
                    <p className="text-xs text-gray-600">Suppliers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{dataStats.stockMovements}</p>
                    <p className="text-xs text-gray-600">Movements</p>
                  </div>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Important Notice</h4>
                    <p className="text-sm text-yellow-700">
                      Importing data will replace all existing data. Make sure to export your current data before importing a backup file.
                    </p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-red-900 mb-4 flex items-center space-x-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Danger Zone</span>
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-red-900">Clear All Data</h5>
                      <p className="text-sm text-red-700 mb-3">
                        Permanently delete all your business data including products, sales, suppliers, stock movements, and settings. 
                        This action cannot be undone.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearData}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All Data</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        {(activeTab === 'business' || activeTab === 'notifications' || activeTab === 'security') && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;