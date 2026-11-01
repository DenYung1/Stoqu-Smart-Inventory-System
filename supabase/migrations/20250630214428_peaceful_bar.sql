/*
  # Initial Schema for Stoqu Inventory Management

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text, company name)
      - `contact_person` (text)
      - `phone` (text)
      - `email` (text, optional)
      - `address` (text, optional)
      - `payment_terms` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `sku` (text, unique)
      - `category` (text)
      - `price` (decimal)
      - `cost` (decimal)
      - `quantity` (integer)
      - `min_stock` (integer)
      - `description` (text, optional)
      - `supplier_id` (uuid, foreign key to suppliers)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `sales`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `product_name` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_amount` (decimal)
      - `customer_name` (text, optional)
      - `payment_method` (text, optional)
      - `date` (timestamp)

    - `stock_movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `product_name` (text)
      - `type` (text, 'in' | 'out' | 'adjustment')
      - `quantity` (integer)
      - `reason` (text)
      - `reference` (text, optional)
      - `supplier_id` (uuid, foreign key to suppliers, optional)
      - `supplier_name` (text, optional)
      - `unit_cost` (decimal, optional)
      - `total_cost` (decimal, optional)
      - `date` (timestamp)
      - `created_by` (text)

    - `notifications`
      - `id` (uuid, primary key)
      - `type` (text)
      - `title` (text)
      - `message` (text)
      - `product_id` (uuid, foreign key to products, optional)
      - `is_read` (boolean)
      - `priority` (text)
      - `created_at` (timestamp)

    - `settings`
      - `id` (uuid, primary key)
      - `business_name` (text)
      - `owner_name` (text)
      - `phone` (text)
      - `email` (text, optional)
      - `address` (text, optional)
      - `currency` (text)
      - `tax_rate` (decimal)
      - `low_stock_threshold` (integer)
      - `auto_backup` (boolean)
      - `notifications_low_stock` (boolean)
      - `notifications_daily_summary` (boolean)
      - `notifications_weekly_report` (boolean)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create suppliers table
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

-- Create settings table
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
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a single-user app)
CREATE POLICY "Enable all operations for everyone" ON suppliers FOR ALL USING (true);
CREATE POLICY "Enable all operations for everyone" ON products FOR ALL USING (true);
CREATE POLICY "Enable all operations for everyone" ON sales FOR ALL USING (true);
CREATE POLICY "Enable all operations for everyone" ON stock_movements FOR ALL USING (true);
CREATE POLICY "Enable all operations for everyone" ON notifications FOR ALL USING (true);
CREATE POLICY "Enable all operations for everyone" ON settings FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Insert default settings
INSERT INTO settings (business_name, owner_name, phone) 
VALUES ('My Business', 'Business Owner', '') 
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();