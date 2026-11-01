-- Master Product Catalog for Pre-built Templates
-- Run this in Supabase SQL Editor

-- Create master products catalog table
CREATE TABLE IF NOT EXISTS master_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  category text NOT NULL,
  subcategory text,
  sku_pattern text, -- Template like "NIKE-{SIZE}-{COLOR}" or auto-generated
  standard_price decimal(10,2), -- Reference pricing in GHS
  description text,
  barcode text,
  image_url text,
  tags text[], -- ["electronics", "smartphone", "android"]
  industry text[], -- ["retail", "electronics", "pharmacy"]
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_master_products_name ON master_products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_master_products_category ON master_products(category);
CREATE INDEX IF NOT EXISTS idx_master_products_brand ON master_products(brand);
CREATE INDEX IF NOT EXISTS idx_master_products_industry ON master_products USING gin(industry);
CREATE INDEX IF NOT EXISTS idx_master_products_tags ON master_products USING gin(tags);

-- Enable RLS (Row Level Security) - but allow public read access for catalog
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to master catalog
CREATE POLICY "Allow public read access to master products" ON master_products FOR SELECT USING (is_active = true);

-- Policy for admin insert/update (restrict to admin users)
CREATE POLICY "Allow admin full access to master products" ON master_products FOR ALL USING (
  auth.jwt() ->> 'email' IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
);

-- Insert sample electronics products
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Smartphones
('iPhone 15 Pro', 'Apple', 'Electronics', 'Smartphones', 'APPL-IP15P-{STORAGE}', 6500.00, 'Latest iPhone with Pro features', ARRAY['smartphone', 'ios', 'premium'], ARRAY['retail', 'electronics']),
('Samsung Galaxy S24', 'Samsung', 'Electronics', 'Smartphones', 'SAM-GS24-{STORAGE}', 4500.00, 'Flagship Android smartphone', ARRAY['smartphone', 'android', 'flagship'], ARRAY['retail', 'electronics']),
('iPhone 14', 'Apple', 'Electronics', 'Smartphones', 'APPL-IP14-{STORAGE}', 4800.00, 'Previous generation iPhone', ARRAY['smartphone', 'ios'], ARRAY['retail', 'electronics']),
('Samsung Galaxy A55', 'Samsung', 'Electronics', 'Smartphones', 'SAM-GA55-{STORAGE}', 1800.00, 'Mid-range Android smartphone', ARRAY['smartphone', 'android', 'budget'], ARRAY['retail', 'electronics']),

-- Laptops
('MacBook Pro 16"', 'Apple', 'Electronics', 'Laptops', 'APPL-MBP16-{STORAGE}', 15000.00, 'Professional laptop for creators', ARRAY['laptop', 'macos', 'professional'], ARRAY['retail', 'electronics']),
('Dell XPS 13', 'Dell', 'Electronics', 'Laptops', 'DELL-XPS13-{STORAGE}', 8500.00, 'Premium ultrabook', ARRAY['laptop', 'windows', 'ultrabook'], ARRAY['retail', 'electronics']),
('HP Pavilion 15', 'HP', 'Electronics', 'Laptops', 'HP-PAV15-{STORAGE}', 3500.00, 'Everyday laptop for students and professionals', ARRAY['laptop', 'windows', 'budget'], ARRAY['retail', 'electronics']),

-- TVs
('Samsung 55" QLED TV', 'Samsung', 'Electronics', 'TVs', 'SAM-QLED55-{MODEL}', 4200.00, '4K QLED Smart TV', ARRAY['tv', 'smart', '4k'], ARRAY['retail', 'electronics']),
('LG 65" OLED TV', 'LG', 'Electronics', 'TVs', 'LG-OLED65-{MODEL}', 8500.00, 'Premium OLED Smart TV', ARRAY['tv', 'oled', 'premium'], ARRAY['retail', 'electronics']),

-- Home Appliances
('Samsung Refrigerator 300L', 'Samsung', 'Home & Garden', 'Appliances', 'SAM-REF300-{COLOR}', 3200.00, 'Double door refrigerator', ARRAY['appliance', 'kitchen', 'refrigerator'], ARRAY['retail', 'home']),
('LG Washing Machine 8kg', 'LG', 'Home & Garden', 'Appliances', 'LG-WM8-{TYPE}', 2800.00, 'Front load washing machine', ARRAY['appliance', 'laundry'], ARRAY['retail', 'home']);

-- Insert sample pharmacy products
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- OTC Medications
('Paracetamol 500mg (20 tablets)', 'Generic', 'Health & Wellness', 'Pain Relief', 'PAR-500-{PACK}', 8.50, 'Pain and fever relief tablets', ARRAY['medication', 'pain-relief', 'otc'], ARRAY['pharmacy', 'health']),
('Ibuprofen 400mg (20 tablets)', 'Generic', 'Health & Wellness', 'Pain Relief', 'IBU-400-{PACK}', 12.00, 'Anti-inflammatory pain relief', ARRAY['medication', 'pain-relief', 'anti-inflammatory'], ARRAY['pharmacy', 'health']),
('Cough Syrup 100ml', 'Benylin', 'Health & Wellness', 'Cough & Cold', 'BEN-CSYR-100ML', 25.00, 'Cough suppressant syrup', ARRAY['medication', 'cough', 'syrup'], ARRAY['pharmacy', 'health']),

-- Vitamins & Supplements
('Vitamin C 1000mg (30 tablets)', 'Nature''s Way', 'Health & Wellness', 'Vitamins', 'NW-VITC-1000', 45.00, 'Immune system support', ARRAY['vitamin', 'supplement', 'immune'], ARRAY['pharmacy', 'health']),
('Multivitamin (30 tablets)', 'Centrum', 'Health & Wellness', 'Vitamins', 'CEN-MULTI-30', 85.00, 'Complete daily multivitamin', ARRAY['vitamin', 'multivitamin', 'daily'], ARRAY['pharmacy', 'health']),

-- Personal Care
('Hand Sanitizer 500ml', 'Dettol', 'Beauty & Personal Care', 'Hygiene', 'DET-HSAN-500ML', 18.00, 'Antibacterial hand sanitizer', ARRAY['hygiene', 'sanitizer', 'antibacterial'], ARRAY['pharmacy', 'retail']),
('Face Mask (50 pieces)', 'Generic', 'Health & Wellness', 'PPE', 'MSK-DISP-50PC', 35.00, 'Disposable surgical face masks', ARRAY['mask', 'ppe', 'protection'], ARRAY['pharmacy', 'health']);

-- Insert sample grocery products
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Beverages
('Coca-Cola 350ml', 'Coca-Cola', 'Food & Beverages', 'Soft Drinks', 'COKE-350ML-{PACK}', 3.50, 'Classic cola soft drink', ARRAY['beverage', 'cola', 'soft-drink'], ARRAY['retail', 'grocery']),
('Sprite 350ml', 'Coca-Cola', 'Food & Beverages', 'Soft Drinks', 'SPRT-350ML-{PACK}', 3.50, 'Lemon-lime soft drink', ARRAY['beverage', 'lemon-lime', 'soft-drink'], ARRAY['retail', 'grocery']),
('Bottled Water 1.5L', 'Voltic', 'Food & Beverages', 'Water', 'VOL-H2O-1.5L', 4.00, 'Pure drinking water', ARRAY['water', 'beverage', 'hydration'], ARRAY['retail', 'grocery']),

-- Snacks
('Pringles Original 160g', 'Pringles', 'Food & Beverages', 'Snacks', 'PRNG-ORIG-160G', 18.00, 'Potato crisps in a tube', ARRAY['snack', 'chips', 'potato'], ARRAY['retail', 'grocery']),
('KitKat 4 Finger 41.5g', 'Nestlé', 'Food & Beverages', 'Chocolate', 'NEST-KK4F-41.5G', 8.50, 'Crispy wafer chocolate bar', ARRAY['chocolate', 'snack', 'wafer'], ARRAY['retail', 'grocery']),

-- Household Items
('Toilet Paper 12 Rolls', 'Softcare', 'Home & Garden', 'Household', 'SOFT-TP-12R', 45.00, 'Soft toilet tissue paper', ARRAY['household', 'tissue', 'bathroom'], ARRAY['retail', 'grocery']),
('Washing Powder 1kg', 'Omo', 'Home & Garden', 'Cleaning', 'OMO-WP-1KG', 28.00, 'Laundry detergent powder', ARRAY['detergent', 'laundry', 'cleaning'], ARRAY['retail', 'grocery']);

-- Insert sample hardware products
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Tools
('Hammer 500g', 'Stanley', 'Tools & Hardware', 'Hand Tools', 'STAN-HAM-500G', 85.00, 'Claw hammer with steel handle', ARRAY['tool', 'hammer', 'construction'], ARRAY['hardware', 'construction']),
('Screwdriver Set (6 pieces)', 'Stanley', 'Tools & Hardware', 'Hand Tools', 'STAN-SCRD-6PC', 45.00, 'Phillips and flathead screwdrivers', ARRAY['tool', 'screwdriver', 'set'], ARRAY['hardware', 'construction']),
('Measuring Tape 5m', 'Stanley', 'Tools & Hardware', 'Measuring', 'STAN-TAPE-5M', 35.00, 'Retractable measuring tape', ARRAY['tool', 'measuring', 'tape'], ARRAY['hardware', 'construction']),

-- Hardware
('Nails 2.5" (1kg)', 'Generic', 'Tools & Hardware', 'Fasteners', 'NAIL-2.5-1KG', 15.00, 'Common construction nails', ARRAY['fastener', 'nail', 'construction'], ARRAY['hardware', 'construction']),
('Screws M6x20mm (100 pieces)', 'Generic', 'Tools & Hardware', 'Fasteners', 'SCREW-M6-20MM', 25.00, 'Machine screws with nuts', ARRAY['fastener', 'screw', 'metal'], ARRAY['hardware', 'construction']);

COMMENT ON TABLE master_products IS 'Pre-built product catalog for quick inventory setup';
