-- Complete fix for products categories issue
-- This script ensures all tables exist and have proper data

-- 1. Ensure is_featured column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'products' 
                  AND column_name = 'is_featured') THEN
        ALTER TABLE public.products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
        PRINT 'Added is_featured column to products table';
    END IF;
END;
$$;

-- 2. Insert categories if they don't exist
INSERT INTO categories (name, description, status) VALUES
('Office Supplies', 'Essential office supplies for businesses', 'active'),
('Technology', 'Computers, tablets, and tech accessories', 'active'),
('Furniture', 'Office furniture and seating', 'active'),
('Stationery', 'Pens, paper, and writing materials', 'active'),
('Storage', 'Filing cabinets and storage solutions', 'active')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert sample products if they don't exist
INSERT INTO products (name, sku, description, category_id, price, stock_quantity, status, image_url, is_featured) VALUES
('Premium Business Notebook', 'NB-001', 'High-quality hardcover notebook for professional use', 
 (SELECT id FROM categories WHERE name = 'Stationery' LIMIT 1), 24.99, 150, 'active', 
 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', true),

('Wireless Mouse', 'WM-002', 'Ergonomic wireless mouse with precision tracking', 
 (SELECT id FROM categories WHERE name = 'Technology' LIMIT 1), 39.99, 200, 'active', 
 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', true),

('Executive Office Chair', 'CH-003', 'Comfortable executive chair with lumbar support', 
 (SELECT id FROM categories WHERE name = 'Furniture' LIMIT 1), 299.99, 25, 'active', 
 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400', true),

('Copy Paper A4', 'CP-004', 'Premium white copy paper, 500 sheets per pack', 
 (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 8.99, 500, 'active', 
 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', false),

('Filing Cabinet', 'FC-005', '4-drawer metal filing cabinet with lock', 
 (SELECT id FROM categories WHERE name = 'Storage' LIMIT 1), 199.99, 15, 'active', 
 'https://images.unsplash.com/photo-1541558869434-2840d308329a?w=400', false),

('Bluetooth Keyboard', 'KB-006', 'Slim wireless keyboard with backlight', 
 (SELECT id FROM categories WHERE name = 'Technology' LIMIT 1), 79.99, 75, 'active', 
 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', true),

('Desk Organizer', 'DO-007', 'Wooden desk organizer with multiple compartments', 
 (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 34.99, 100, 'active', 
 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400', false),

('Monitor Stand', 'MS-008', 'Adjustable monitor stand with storage drawer', 
 (SELECT id FROM categories WHERE name = 'Furniture' LIMIT 1), 89.99, 50, 'active', 
 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', false)

ON CONFLICT (sku) DO NOTHING;

-- 4. Update existing products without is_featured to have the column
UPDATE products SET is_featured = false WHERE is_featured IS NULL;

-- 5. Check our data
SELECT 
    p.id, p.name, p.sku, p.price, p.is_featured,
    c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.id;
