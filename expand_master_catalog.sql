-- Expand Master Product Catalog - Phase 2
-- Run this in Supabase SQL Editor to add more comprehensive product categories

-- Beauty & Personal Care Products (Salons, Beauty Shops)
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Hair Care
('Shampoo 500ml', 'L''Oréal', 'Beauty & Personal Care', 'Hair Care', 'LOR-SHAM-500ML', 35.00, 'Professional hair shampoo', ARRAY['shampoo', 'hair-care', 'professional'], ARRAY['beauty', 'salon']),
('Hair Conditioner 500ml', 'L''Oréal', 'Beauty & Personal Care', 'Hair Care', 'LOR-COND-500ML', 38.00, 'Moisturizing hair conditioner', ARRAY['conditioner', 'hair-care', 'moisturizing'], ARRAY['beauty', 'salon']),
('Hair Oil 200ml', 'Pantene', 'Beauty & Personal Care', 'Hair Care', 'PAN-OIL-200ML', 25.00, 'Nourishing hair oil treatment', ARRAY['hair-oil', 'treatment', 'nourishing'], ARRAY['beauty', 'salon']),
('Hair Relaxer Kit', 'Dark & Lovely', 'Beauty & Personal Care', 'Hair Care', 'DAL-RELAX-KIT', 45.00, 'Complete hair relaxer treatment', ARRAY['relaxer', 'treatment', 'professional'], ARRAY['beauty', 'salon']),

-- Skincare
('Facial Cleanser 150ml', 'Neutrogena', 'Beauty & Personal Care', 'Skincare', 'NEU-CLEAN-150ML', 28.00, 'Deep cleaning facial wash', ARRAY['cleanser', 'skincare', 'facial'], ARRAY['beauty', 'pharmacy']),
('Moisturizer SPF 30', 'Nivea', 'Beauty & Personal Care', 'Skincare', 'NIV-MOIST-SPF30', 32.00, 'Daily moisturizer with sun protection', ARRAY['moisturizer', 'spf', 'daily'], ARRAY['beauty', 'pharmacy']),
('Anti-Aging Serum 30ml', 'Olay', 'Beauty & Personal Care', 'Skincare', 'OLA-SERUM-30ML', 85.00, 'Anti-aging face serum', ARRAY['serum', 'anti-aging', 'premium'], ARRAY['beauty', 'pharmacy']),

-- Makeup
('Foundation 30ml', 'Maybelline', 'Beauty & Personal Care', 'Makeup', 'MAY-FOUND-30ML', 45.00, 'Liquid foundation makeup', ARRAY['foundation', 'makeup', 'liquid'], ARRAY['beauty', 'retail']),
('Lipstick', 'MAC', 'Beauty & Personal Care', 'Makeup', 'MAC-LIPS-{SHADE}', 65.00, 'Premium lipstick', ARRAY['lipstick', 'makeup', 'premium'], ARRAY['beauty', 'retail']),
('Mascara', 'Revlon', 'Beauty & Personal Care', 'Makeup', 'REV-MASC-{TYPE}', 38.00, 'Volume mascara', ARRAY['mascara', 'makeup', 'volume'], ARRAY['beauty', 'retail']);

-- Automotive & Car Parts
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Engine Oil & Fluids
('Engine Oil 5W-30 (4L)', 'Mobil 1', 'Automotive', 'Engine Oil', 'MOB-OIL-5W30-4L', 180.00, 'Synthetic engine oil', ARRAY['engine-oil', 'synthetic', '5w-30'], ARRAY['automotive', 'garage']),
('Brake Fluid DOT 4 (500ml)', 'Castrol', 'Automotive', 'Fluids', 'CAS-BRAKE-DOT4', 35.00, 'High performance brake fluid', ARRAY['brake-fluid', 'dot4', 'performance'], ARRAY['automotive', 'garage']),
('Coolant/Antifreeze (1L)', 'Prestone', 'Automotive', 'Fluids', 'PRE-COOL-1L', 45.00, 'Engine coolant and antifreeze', ARRAY['coolant', 'antifreeze', 'engine'], ARRAY['automotive', 'garage']),

-- Car Parts
('Brake Pads (Front)', 'Bosch', 'Automotive', 'Brake Parts', 'BOS-PAD-FRONT', 120.00, 'Front brake pads', ARRAY['brake-pads', 'front', 'safety'], ARRAY['automotive', 'garage']),
('Air Filter', 'Mann Filter', 'Automotive', 'Filters', 'MAN-AIR-FILT', 35.00, 'Engine air filter', ARRAY['air-filter', 'engine', 'maintenance'], ARRAY['automotive', 'garage']),
('Spark Plugs (Set of 4)', 'NGK', 'Automotive', 'Engine Parts', 'NGK-SPARK-4PC', 85.00, 'Iridium spark plugs', ARRAY['spark-plugs', 'iridium', 'performance'], ARRAY['automotive', 'garage']),

-- Car Accessories
('Car Battery 12V 70Ah', 'Varta', 'Automotive', 'Electrical', 'VAR-BAT-12V70', 450.00, 'Car battery 12V 70Ah', ARRAY['battery', '12v', 'starter'], ARRAY['automotive', 'garage']),
('Car Polish 500ml', 'Turtle Wax', 'Automotive', 'Care Products', 'TUR-POL-500ML', 35.00, 'Car polish and shine', ARRAY['polish', 'shine', 'care'], ARRAY['automotive', 'retail']);

-- Restaurant & Catering Supplies
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Kitchen Equipment
('Blender 1.5L', 'Binatone', 'Home & Garden', 'Kitchen Appliances', 'BIN-BLEND-1.5L', 280.00, 'High-speed blender', ARRAY['blender', 'kitchen', '1.5l'], ARRAY['restaurant', 'home']),
('Rice Cooker 2.8L', 'Russell Hobbs', 'Home & Garden', 'Kitchen Appliances', 'RUS-RICE-2.8L', 320.00, 'Automatic rice cooker', ARRAY['rice-cooker', 'automatic', '2.8l'], ARRAY['restaurant', 'home']),
('Microwave Oven 20L', 'Sharp', 'Home & Garden', 'Kitchen Appliances', 'SHA-MICRO-20L', 850.00, 'Microwave oven 20L capacity', ARRAY['microwave', 'oven', '20l'], ARRAY['restaurant', 'home']),

-- Disposable Items
('Plastic Plates (50 pack)', 'Generic', 'Home & Garden', 'Disposables', 'PLAT-DISP-50PC', 25.00, 'Disposable plastic plates', ARRAY['plates', 'disposable', 'plastic'], ARRAY['restaurant', 'catering']),
('Paper Cups (100 pack)', 'Generic', 'Home & Garden', 'Disposables', 'CUP-PAP-100PC', 20.00, 'Disposable paper cups', ARRAY['cups', 'paper', 'disposable'], ARRAY['restaurant', 'catering']),
('Aluminum Foil 30m', 'Reynolds', 'Home & Garden', 'Kitchen Supplies', 'REY-FOIL-30M', 18.00, 'Heavy duty aluminum foil', ARRAY['foil', 'aluminum', 'kitchen'], ARRAY['restaurant', 'catering']);

-- Office & Stationery
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Writing Supplies
('Ballpoint Pens (10 pack)', 'Bic', 'Office Supplies', 'Writing', 'BIC-PEN-10PC', 15.00, 'Blue ballpoint pens', ARRAY['pens', 'ballpoint', 'writing'], ARRAY['office', 'retail']),
('Pencils HB (12 pack)', 'Staedtler', 'Office Supplies', 'Writing', 'STA-PENC-HB12', 18.00, 'HB graphite pencils', ARRAY['pencils', 'hb', 'graphite'], ARRAY['office', 'retail']),
('Markers (12 colors)', 'Crayola', 'Office Supplies', 'Writing', 'CRA-MARK-12COL', 35.00, 'Washable markers 12 colors', ARRAY['markers', 'colors', 'washable'], ARRAY['office', 'retail']),

-- Paper Products
('A4 Paper (500 sheets)', 'Double A', 'Office Supplies', 'Paper', 'DBA-A4-500SH', 25.00, 'White A4 copy paper', ARRAY['paper', 'a4', 'copy'], ARRAY['office', 'retail']),
('Notebooks A5 (5 pack)', 'Generic', 'Office Supplies', 'Paper', 'NOTE-A5-5PC', 20.00, 'Exercise notebooks A5', ARRAY['notebooks', 'a5', 'exercise'], ARRAY['office', 'retail']),
('Sticky Notes 76x76mm', '3M Post-it', 'Office Supplies', 'Paper', '3M-STICK-76MM', 12.00, 'Yellow sticky notes', ARRAY['sticky-notes', 'post-it', 'yellow'], ARRAY['office', 'retail']),

-- Office Equipment
('Stapler + Staples', 'Rexel', 'Office Supplies', 'Equipment', 'REX-STAPL-SET', 45.00, 'Desktop stapler with staples', ARRAY['stapler', 'staples', 'desktop'], ARRAY['office', 'retail']),
('Calculator Scientific', 'Casio', 'Office Supplies', 'Equipment', 'CAS-CALC-SCI', 85.00, 'Scientific calculator', ARRAY['calculator', 'scientific', 'math'], ARRAY['office', 'retail']),
('Desk Lamp LED', 'Philips', 'Office Supplies', 'Equipment', 'PHI-LAMP-LED', 120.00, 'LED desk lamp adjustable', ARRAY['lamp', 'led', 'desk'], ARRAY['office', 'retail']);

-- Sports & Fitness
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Fitness Equipment
('Yoga Mat 6mm', 'Nike', 'Sports & Outdoors', 'Fitness', 'NIK-YOGA-6MM', 85.00, 'Non-slip yoga exercise mat', ARRAY['yoga', 'mat', 'fitness'], ARRAY['sports', 'retail']),
('Dumbbells 5kg (Pair)', 'Everlast', 'Sports & Outdoors', 'Fitness', 'EVE-DUMB-5KG', 180.00, 'Rubber dumbbells 5kg pair', ARRAY['dumbbells', '5kg', 'rubber'], ARRAY['sports', 'retail']),
('Resistance Bands Set', 'TRX', 'Sports & Outdoors', 'Fitness', 'TRX-BAND-SET', 65.00, 'Resistance exercise bands', ARRAY['resistance', 'bands', 'exercise'], ARRAY['sports', 'retail']),

-- Sports Equipment
('Football/Soccer Ball', 'Adidas', 'Sports & Outdoors', 'Ball Sports', 'ADI-FOOT-BALL', 120.00, 'Official size football', ARRAY['football', 'soccer', 'ball'], ARRAY['sports', 'retail']),
('Basketball', 'Spalding', 'Sports & Outdoors', 'Ball Sports', 'SPA-BASK-BALL', 95.00, 'Official basketball', ARRAY['basketball', 'ball', 'official'], ARRAY['sports', 'retail']),
('Tennis Racket', 'Wilson', 'Sports & Outdoors', 'Racket Sports', 'WIL-TENN-RACK', 280.00, 'Professional tennis racket', ARRAY['tennis', 'racket', 'professional'], ARRAY['sports', 'retail']);

-- Children & Baby Products
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Baby Care
('Baby Diapers Size 3 (30 pack)', 'Pampers', 'Beauty & Personal Care', 'Baby Care', 'PAM-DIAP-S3-30', 45.00, 'Baby diapers size 3', ARRAY['diapers', 'baby', 'size3'], ARRAY['pharmacy', 'retail']),
('Baby Wipes (80 pack)', 'Huggies', 'Beauty & Personal Care', 'Baby Care', 'HUG-WIPE-80PC', 18.00, 'Gentle baby wipes', ARRAY['wipes', 'baby', 'gentle'], ARRAY['pharmacy', 'retail']),
('Baby Formula 400g', 'Nan', 'Food & Beverages', 'Baby Food', 'NAN-FORM-400G', 85.00, 'Infant milk formula', ARRAY['formula', 'baby', 'milk'], ARRAY['pharmacy', 'grocery']),

-- Toys
('Building Blocks Set', 'Lego', 'Toys & Games', 'Building', 'LEG-BLOC-SET', 120.00, 'Creative building blocks', ARRAY['blocks', 'building', 'creative'], ARRAY['retail', 'toy']),
('Puzzle 100 pieces', 'Ravensburger', 'Toys & Games', 'Puzzles', 'RAV-PUZZ-100PC', 35.00, 'Educational jigsaw puzzle', ARRAY['puzzle', 'educational', '100pc'], ARRAY['retail', 'toy']),
('Coloring Books (5 pack)', 'Generic', 'Toys & Games', 'Arts & Crafts', 'COLOR-BOOK-5PC', 25.00, 'Children coloring books', ARRAY['coloring', 'books', 'children'], ARRAY['retail', 'toy']);

-- Pet Supplies
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Dog Supplies
('Dog Food Dry 10kg', 'Pedigree', 'Pet Supplies', 'Dog Food', 'PED-FOOD-10KG', 180.00, 'Adult dog dry food', ARRAY['dog-food', 'dry', 'adult'], ARRAY['pet', 'retail']),
('Dog Leash 1.5m', 'Generic', 'Pet Supplies', 'Dog Accessories', 'DOG-LEASH-1.5M', 25.00, 'Strong dog leash 1.5m', ARRAY['leash', 'dog', '1.5m'], ARRAY['pet', 'retail']),
('Dog Toys (3 pack)', 'Kong', 'Pet Supplies', 'Dog Toys', 'KONG-TOY-3PC', 45.00, 'Durable dog chew toys', ARRAY['toys', 'dog', 'chew'], ARRAY['pet', 'retail']),

-- Cat Supplies
('Cat Food Wet (12 cans)', 'Whiskas', 'Pet Supplies', 'Cat Food', 'WHI-FOOD-12CAN', 65.00, 'Adult cat wet food variety', ARRAY['cat-food', 'wet', 'adult'], ARRAY['pet', 'retail']),
('Cat Litter 10L', 'Catsan', 'Pet Supplies', 'Cat Care', 'CAT-LITT-10L', 85.00, 'Clumping cat litter', ARRAY['litter', 'cat', 'clumping'], ARRAY['pet', 'retail']),
('Cat Scratching Post', 'Generic', 'Pet Supplies', 'Cat Furniture', 'CAT-SCRAT-POST', 120.00, 'Sisal rope scratching post', ARRAY['scratching', 'post', 'sisal'], ARRAY['pet', 'retail']);

-- Electronics & Gadgets (Extended)
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Phone Accessories
('Phone Case iPhone 15', 'Spigen', 'Electronics', 'Phone Accessories', 'SPI-CASE-IP15', 45.00, 'Protective phone case iPhone 15', ARRAY['case', 'iphone15', 'protective'], ARRAY['electronics', 'retail']),
('Screen Protector Galaxy S24', 'Belkin', 'Electronics', 'Phone Accessories', 'BEL-PROT-GS24', 25.00, 'Tempered glass screen protector', ARRAY['screen-protector', 'galaxy-s24', 'glass'], ARRAY['electronics', 'retail']),
('Phone Charger USB-C 20W', 'Anker', 'Electronics', 'Chargers', 'ANK-CHAR-20W', 65.00, 'Fast charging USB-C adapter', ARRAY['charger', 'usb-c', 'fast'], ARRAY['electronics', 'retail']),
('Power Bank 10000mAh', 'Xiaomi', 'Electronics', 'Power Banks', 'XIA-BANK-10K', 85.00, 'Portable power bank 10000mAh', ARRAY['power-bank', '10000mah', 'portable'], ARRAY['electronics', 'retail']),

-- Computer Accessories
('Wireless Mouse', 'Logitech', 'Electronics', 'Computer Accessories', 'LOG-MOUS-WIRE', 65.00, 'Wireless optical mouse', ARRAY['mouse', 'wireless', 'optical'], ARRAY['electronics', 'office']),
('USB Flash Drive 32GB', 'SanDisk', 'Electronics', 'Storage', 'SAN-USB-32GB', 35.00, 'USB 3.0 flash drive 32GB', ARRAY['usb', 'flash', '32gb'], ARRAY['electronics', 'office']),
('Bluetooth Headphones', 'Sony', 'Electronics', 'Audio', 'SON-HEAD-BT', 180.00, 'Wireless Bluetooth headphones', ARRAY['headphones', 'bluetooth', 'wireless'], ARRAY['electronics', 'retail']),
('Webcam HD 1080p', 'Logitech', 'Electronics', 'Computer Accessories', 'LOG-CAM-1080P', 120.00, 'HD webcam for video calls', ARRAY['webcam', 'hd', '1080p'], ARRAY['electronics', 'office']);

-- Home Improvement & Garden
INSERT INTO master_products (name, brand, category, subcategory, sku_pattern, standard_price, description, tags, industry) VALUES
-- Gardening
('Garden Hose 20m', 'Hozelock', 'Home & Garden', 'Gardening', 'HOZ-HOSE-20M', 85.00, 'Flexible garden hose 20m', ARRAY['hose', 'garden', '20m'], ARRAY['garden', 'home']),
('Plant Fertilizer 2kg', 'Miracle-Gro', 'Home & Garden', 'Gardening', 'MIR-FERT-2KG', 45.00, 'All-purpose plant fertilizer', ARRAY['fertilizer', 'plants', '2kg'], ARRAY['garden', 'home']),
('Garden Gloves (Pair)', 'Gardena', 'Home & Garden', 'Gardening', 'GAR-GLOV-PAIR', 25.00, 'Protective gardening gloves', ARRAY['gloves', 'gardening', 'protective'], ARRAY['garden', 'home']),

-- Home Maintenance
('Paint Brush Set (5 pieces)', 'Harris', 'Home & Garden', 'Paint Supplies', 'HAR-BRUS-5PC', 35.00, 'Professional paint brushes', ARRAY['brushes', 'paint', 'professional'], ARRAY['hardware', 'home']),
('Masking Tape 50mm', '3M', 'Home & Garden', 'Paint Supplies', '3M-MASK-50MM', 15.00, 'Painter masking tape', ARRAY['tape', 'masking', 'painter'], ARRAY['hardware', 'home']),
('Sandpaper Assorted (10 sheets)', 'Norton', 'Home & Garden', 'Hardware', 'NOR-SAND-10SH', 20.00, 'Assorted grit sandpaper', ARRAY['sandpaper', 'assorted', 'grit'], ARRAY['hardware', 'home']);

COMMENT ON TABLE master_products IS 'Comprehensive product catalog with 100+ products across multiple industries';
