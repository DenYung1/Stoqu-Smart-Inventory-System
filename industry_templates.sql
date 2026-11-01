-- Industry-Specific Product Templates
-- Run this in Supabase SQL Editor to add curated product sets for different business types

-- Create a table for industry templates (collections of related products)
CREATE TABLE IF NOT EXISTS industry_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  industry text NOT NULL,
  business_type text NOT NULL,
  product_count integer DEFAULT 0,
  estimated_setup_time text DEFAULT '15 minutes',
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create junction table linking templates to products
CREATE TABLE IF NOT EXISTS template_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES industry_templates(id) ON DELETE CASCADE,
  master_product_id uuid REFERENCES master_products(id) ON DELETE CASCADE,
  suggested_markup_percent decimal(5,2) DEFAULT 30.00,
  is_essential boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Insert industry templates
INSERT INTO industry_templates (name, description, industry, business_type, product_count, estimated_setup_time, is_featured) VALUES
('Beauty Salon Starter Pack', 'Essential products for beauty salons and hair care businesses', 'beauty', 'salon', 15, '10 minutes', true),
('Pharmacy Essentials', 'Common medications and health products for pharmacies', 'pharmacy', 'pharmacy', 20, '15 minutes', true),
('Electronics Shop Basic', 'Popular electronics for small electronics retailers', 'electronics', 'retail', 25, '20 minutes', true),
('Grocery Store Starter', 'Fast-moving consumer goods for grocery stores', 'grocery', 'grocery', 30, '25 minutes', true),
('Auto Parts Shop', 'Essential automotive parts and fluids for garages', 'automotive', 'garage', 18, '15 minutes', true),
('Office Supply Store', 'Common stationery and office equipment', 'office', 'retail', 22, '18 minutes', true),
('Pet Shop Basics', 'Essential pet supplies for dog and cat owners', 'pet', 'retail', 16, '12 minutes', false),
('Sports & Fitness Store', 'Popular fitness and sports equipment', 'sports', 'retail', 14, '12 minutes', false),
('Baby & Kids Store', 'Essential baby care and children products', 'baby', 'retail', 12, '10 minutes', false),
('Restaurant Supplies', 'Kitchen equipment and disposables for restaurants', 'restaurant', 'catering', 20, '15 minutes', false);

-- Beauty Salon Starter Pack
INSERT INTO template_products (template_id, master_product_id, suggested_markup_percent, is_essential, display_order)
SELECT 
  (SELECT id FROM industry_templates WHERE name = 'Beauty Salon Starter Pack'),
  mp.id,
  CASE 
    WHEN mp.name ILIKE '%shampoo%' OR mp.name ILIKE '%conditioner%' THEN 40.00
    WHEN mp.name ILIKE '%oil%' OR mp.name ILIKE '%serum%' THEN 50.00
    ELSE 35.00
  END,
  CASE 
    WHEN mp.name ILIKE '%shampoo%' OR mp.name ILIKE '%conditioner%' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY mp.standard_price DESC)
FROM master_products mp
WHERE mp.industry && ARRAY['beauty', 'salon']
  AND mp.category = 'Beauty & Personal Care'
  AND mp.subcategory IN ('Hair Care', 'Skincare')
LIMIT 15;

-- Pharmacy Essentials
INSERT INTO template_products (template_id, master_product_id, suggested_markup_percent, is_essential, display_order)
SELECT 
  (SELECT id FROM industry_templates WHERE name = 'Pharmacy Essentials'),
  mp.id,
  CASE 
    WHEN mp.subcategory = 'Pain Relief' THEN 25.00
    WHEN mp.subcategory = 'Vitamins' THEN 35.00
    WHEN mp.subcategory = 'Baby Care' THEN 30.00
    ELSE 28.00
  END,
  CASE 
    WHEN mp.name ILIKE '%paracetamol%' OR mp.name ILIKE '%ibuprofen%' THEN true
    WHEN mp.name ILIKE '%sanitizer%' OR mp.name ILIKE '%mask%' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY mp.standard_price ASC)
FROM master_products mp
WHERE mp.industry && ARRAY['pharmacy', 'health']
  AND mp.category IN ('Health & Wellness', 'Beauty & Personal Care')
LIMIT 20;

-- Electronics Shop Basic
INSERT INTO template_products (template_id, master_product_id, suggested_markup_percent, is_essential, display_order)
SELECT 
  (SELECT id FROM industry_templates WHERE name = 'Electronics Shop Basic'),
  mp.id,
  CASE 
    WHEN mp.subcategory = 'Smartphones' THEN 15.00
    WHEN mp.subcategory = 'Laptops' THEN 12.00
    WHEN mp.subcategory = 'Phone Accessories' THEN 45.00
    WHEN mp.subcategory = 'Chargers' THEN 40.00
    ELSE 25.00
  END,
  CASE 
    WHEN mp.name ILIKE '%iphone%' OR mp.name ILIKE '%samsung galaxy%' THEN true
    WHEN mp.name ILIKE '%charger%' OR mp.name ILIKE '%case%' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY mp.standard_price DESC)
FROM master_products mp
WHERE mp.industry && ARRAY['electronics', 'retail']
  AND mp.category = 'Electronics'
LIMIT 25;

-- Grocery Store Starter
INSERT INTO template_products (template_id, master_product_id, suggested_markup_percent, is_essential, display_order)
SELECT 
  (SELECT id FROM industry_templates WHERE name = 'Grocery Store Starter'),
  mp.id,
  CASE 
    WHEN mp.subcategory = 'Soft Drinks' THEN 35.00
    WHEN mp.subcategory = 'Snacks' THEN 40.00
    WHEN mp.subcategory = 'Water' THEN 30.00
    WHEN mp.subcategory = 'Household' THEN 25.00
    ELSE 32.00
  END,
  CASE 
    WHEN mp.name ILIKE '%coca-cola%' OR mp.name ILIKE '%water%' THEN true
    WHEN mp.name ILIKE '%toilet paper%' OR mp.name ILIKE '%washing%' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY mp.standard_price ASC)
FROM master_products mp
WHERE mp.industry && ARRAY['grocery', 'retail']
  AND mp.category IN ('Food & Beverages', 'Home & Garden')
LIMIT 30;

-- Auto Parts Shop
INSERT INTO template_products (template_id, master_product_id, suggested_markup_percent, is_essential, display_order)
SELECT 
  (SELECT id FROM industry_templates WHERE name = 'Auto Parts Shop'),
  mp.id,
  CASE 
    WHEN mp.subcategory = 'Engine Oil' THEN 20.00
    WHEN mp.subcategory = 'Brake Parts' THEN 35.00
    WHEN mp.subcategory = 'Filters' THEN 40.00
    WHEN mp.subcategory = 'Electrical' THEN 25.00
    ELSE 30.00
  END,
  CASE 
    WHEN mp.name ILIKE '%engine oil%' OR mp.name ILIKE '%brake%' THEN true
    WHEN mp.name ILIKE '%battery%' OR mp.name ILIKE '%filter%' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY mp.standard_price DESC)
FROM master_products mp
WHERE mp.industry && ARRAY['automotive', 'garage']
  AND mp.category = 'Automotive'
LIMIT 18;

-- Office Supply Store
INSERT INTO template_products (template_id, master_product_id, suggested_markup_percent, is_essential, display_order)
SELECT 
  (SELECT id FROM industry_templates WHERE name = 'Office Supply Store'),
  mp.id,
  CASE 
    WHEN mp.subcategory = 'Writing' THEN 50.00
    WHEN mp.subcategory = 'Paper' THEN 35.00
    WHEN mp.subcategory = 'Equipment' THEN 25.00
    ELSE 40.00
  END,
  CASE 
    WHEN mp.name ILIKE '%pen%' OR mp.name ILIKE '%paper%' THEN true
    WHEN mp.name ILIKE '%notebook%' OR mp.name ILIKE '%stapler%' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY mp.standard_price ASC)
FROM master_products mp
WHERE mp.industry && ARRAY['office', 'retail']
  AND mp.category = 'Office Supplies'
LIMIT 22;

-- Update product counts in templates
UPDATE industry_templates SET product_count = (
  SELECT COUNT(*) 
  FROM template_products tp 
  WHERE tp.template_id = industry_templates.id
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_products_template_id ON template_products(template_id);
CREATE INDEX IF NOT EXISTS idx_template_products_master_product_id ON template_products(master_product_id);
CREATE INDEX IF NOT EXISTS idx_industry_templates_industry ON industry_templates(industry);
CREATE INDEX IF NOT EXISTS idx_industry_templates_business_type ON industry_templates(business_type);

-- Enable RLS for templates
ALTER TABLE industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to templates
CREATE POLICY "Allow public read access to industry templates" ON industry_templates FOR SELECT USING (true);
CREATE POLICY "Allow public read access to template products" ON template_products FOR SELECT USING (true);

-- Allow admin full access to templates
CREATE POLICY "Allow admin full access to industry templates" ON industry_templates FOR ALL USING (
  auth.jwt() ->> 'email' IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
);
CREATE POLICY "Allow admin full access to template products" ON template_products FOR ALL USING (
  auth.jwt() ->> 'email' IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
);

COMMENT ON TABLE industry_templates IS 'Curated product collections for specific business types';
COMMENT ON TABLE template_products IS 'Products included in each industry template with suggested markups';
