-- Sample data for testing the application
-- Insert categories first
INSERT INTO categories (name, description, status) VALUES
('Office Supplies', 'Essential office supplies for businesses', 'active'),
('Technology', 'Computers, tablets, and tech accessories', 'active'),
('Furniture', 'Office furniture and seating', 'active'),
('Stationery', 'Pens, paper, and writing materials', 'active'),
('Storage', 'Filing cabinets and storage solutions', 'active')
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, sku, description, category_id, price, stock_quantity, status, image_url) VALUES
('Premium Business Notebook', 'NB-001', 'High-quality hardcover notebook for professional use', 
 (SELECT id FROM categories WHERE name = 'Stationery' LIMIT 1), 24.99, 150, 'active', 
 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'),

('Wireless Mouse', 'WM-002', 'Ergonomic wireless mouse with precision tracking', 
 (SELECT id FROM categories WHERE name = 'Technology' LIMIT 1), 39.99, 200, 'active', 
 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'),

('Executive Office Chair', 'CH-003', 'Comfortable executive chair with lumbar support', 
 (SELECT id FROM categories WHERE name = 'Furniture' LIMIT 1), 299.99, 25, 'active', 
 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'),

('Copy Paper A4', 'CP-004', 'Premium white copy paper, 500 sheets per pack', 
 (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 8.99, 500, 'active', 
 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'),

('Filing Cabinet', 'FC-005', '4-drawer metal filing cabinet with lock', 
 (SELECT id FROM categories WHERE name = 'Storage' LIMIT 1), 199.99, 15, 'active', 
 'https://images.unsplash.com/photo-1541558869434-2840d308329a?w=400'),

('Bluetooth Keyboard', 'KB-006', 'Slim wireless keyboard with backlight', 
 (SELECT id FROM categories WHERE name = 'Technology' LIMIT 1), 79.99, 75, 'active', 
 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400'),

('Desk Organizer', 'DO-007', 'Wooden desk organizer with multiple compartments', 
 (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 34.99, 100, 'active', 
 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400'),

('Monitor Stand', 'MS-008', 'Adjustable monitor stand with storage drawer', 
 (SELECT id FROM categories WHERE name = 'Furniture' LIMIT 1), 89.99, 50, 'active', 
 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400')

ON CONFLICT (sku) DO NOTHING;

-- Add is_featured column if it doesn't exist and mark some products as featured
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN 
            -- Column already exists, do nothing
    END;
END $$;

-- Mark some products as featured
UPDATE products SET is_featured = TRUE 
WHERE sku IN ('NB-001', 'WM-002', 'CH-003', 'KB-006');

-- Refresh stats if the function exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_admin_stats') THEN
        PERFORM refresh_admin_stats();
    END IF;
END $$;
