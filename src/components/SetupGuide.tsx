import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Database, ArrowRight } from 'lucide-react';

const SetupGuide: React.FC = () => {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const migrationSQL = `-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  payment_terms text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  description text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  customer_name text,
  payment_method text,
  date timestamptz DEFAULT now()
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  reason text NOT NULL,
  reference text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  unit_cost decimal(10,2),
  total_cost decimal(10,2),
  date timestamptz DEFAULT now(),
  created_by text NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  priority text NOT NULL DEFAULT 'low',
  created_at timestamptz DEFAULT now()
);

-- Create settings table with user_id column and unique constraint
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'My Business',
  owner_name text NOT NULL DEFAULT 'Business Owner',
  phone text NOT NULL DEFAULT '',
  email text,
  address text,
  currency text NOT NULL DEFAULT 'GHS',
  tax_rate decimal(5,2) NOT NULL DEFAULT 12.5,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  auto_backup boolean DEFAULT true,
  notifications_low_stock boolean DEFAULT true,
  notifications_daily_summary boolean DEFAULT true,
  notifications_weekly_report boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  trial_days integer DEFAULT 0,
  active boolean DEFAULT true,
  popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  transaction_id text NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  payment_method text NOT NULL DEFAULT 'mtn_momo',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by text,
  rejection_reason text,
  user_email text NOT NULL,
  user_business_name text NOT NULL,
  plan_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own settings" ON settings;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can view their own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Admins can view all payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Admins can update payment requests" ON payment_requests;

-- Create RLS policies for authenticated users - FIXED to prevent cross-user data access
CREATE POLICY "Users can manage their own suppliers" ON suppliers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own products" ON products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own sales" ON sales FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own stock movements" ON stock_movements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notifications" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Settings policies - users can manage their own
CREATE POLICY "Users can view their own settings" ON settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Subscription plan policies
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans FOR SELECT USING (active = true);

-- User subscription policies - users can manage their own
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Payment request policies
CREATE POLICY "Users can insert their own payment requests" ON payment_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment requests" ON payment_requests 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment requests" ON payment_requests 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
    )
  );

CREATE POLICY "Admins can update payment requests" ON payment_requests 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period ON user_subscriptions(current_period_start, current_period_end);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_submitted_at ON payment_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_transaction_id ON payment_requests(transaction_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('free', 'Free Plan', 0, 'GHS', 'month', '["Basic inventory tracking", "Up to 100 products", "Basic reports"]'::jsonb, 0, true),
('basic', 'Basic Plan', 29, 'GHS', 'month', '["Unlimited products", "Advanced reports", "Supplier management", "Low stock alerts"]'::jsonb, 14, true),
('pro', 'Pro Plan', 59, 'GHS', 'month', '["Everything in Basic", "Multi-location support", "Advanced analytics", "API access", "Priority support"]'::jsonb, 14, true)
ON CONFLICT (id) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create handle_new_user function for automatic settings creation with error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  business_name_val text;
  owner_name_val text;
BEGIN
  -- Set elevated privileges to bypass RLS
  SET role postgres;
  
  -- Extract business_name and owner_name from user metadata, with fallbacks
  business_name_val := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  owner_name_val := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
  
  -- Insert settings with ON CONFLICT to handle potential duplicates
  INSERT INTO settings (user_id, business_name, owner_name, phone)
  VALUES (NEW.id, business_name_val, owner_name_val, '')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert user subscription with ON CONFLICT to handle potential duplicates
  INSERT INTO user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    NEW.id, 
    'free', 
    'trial', 
    now(), 
    now() + interval '14 days',
    now() + interval '1 month'
  )
  ON CONFLICT (user_id, plan_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_requests_updated_at BEFORE UPDATE ON payment_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user setup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-ghana-gold to-primary-500 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connect to Supabase</h2>
              <p className="text-gray-600">Set up your cloud database in 3 easy steps</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-8">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= stepNum ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNum ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Create Supabase Project */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Step 1: Create Supabase Project</h3>
                <div className="space-y-4">
                  <p className="text-blue-800">
                    Create a free Supabase account and project to host your inventory database.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <span>Open Supabase Dashboard</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Quick Setup Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      <li>Click "New Project" in your Supabase dashboard</li>
                      <li>Choose a project name (e.g., "stoqu-inventory")</li>
                      <li>Set a strong database password</li>
                      <li>Select a region close to Ghana (Europe West recommended)</li>
                      <li>Click "Create new project"</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <span>Next: Get API Keys</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Get API Keys */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Step 2: Copy Your API Keys</h3>
                <div className="space-y-4">
                  <p className="text-green-800">
                    Once your project is created, copy your Project URL and API Key.
                  </p>
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Where to find your keys:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
                      <li>Go to your project dashboard</li>
                      <li>Click on "Settings" in the left sidebar</li>
                      <li>Click on "API" in the settings menu</li>
                      <li>Copy the "Project URL" and "anon public" key</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> Make sure to copy the "anon public" key, not the "service_role" key.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <span>Next: Setup Database</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Setup Database */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-3">Step 3: Setup Database Tables</h3>
                <div className="space-y-4">
                  <p className="text-purple-800">
                    Run this SQL script in your Supabase SQL Editor to create all necessary tables.
                  </p>
                  <div className="bg-white border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800">
                      <li>Go to your Supabase project dashboard</li>
                      <li>Click on "SQL Editor" in the left sidebar</li>
                      <li>Click "New Query"</li>
                      <li>Copy and paste the SQL script below</li>
                      <li>Click "Run" to execute the script</li>
                    </ol>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">SQL Migration Script</span>
                      <button
                        onClick={() => copyToClipboard(migrationSQL, 'sql')}
                        className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
                      >
                        {copied === 'sql' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-sm">{copied === 'sql' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="text-gray-300 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {migrationSQL}
                    </pre>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="font-medium text-green-900 mb-2">🎉 Almost Done!</h4>
                <p className="text-green-800 text-sm">
                  After running the SQL script, update your environment variables with your Supabase credentials and refresh the page. 
                  Your inventory system will automatically connect to the cloud database!
                </p>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupGuide;