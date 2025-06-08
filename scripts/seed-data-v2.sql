-- Updated seed data with credit limits for personal accounts

-- Clear existing data
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM users;

-- Insert categories
INSERT INTO categories (name, description) VALUES
('Paper', 'All types of paper products including copy paper, cardstock, and specialty papers'),
('Ink & Toner', 'Printer cartridges, ink refills, and toner for all major printer brands'),
('Office Supplies', 'Essential office supplies including pens, pencils, staplers, and organizers'),
('Technology', 'Computer accessories, cables, and electronic devices'),
('Coffee & Snacks', 'Break room supplies including coffee, tea, and snacks'),
('Cleaning', 'Cleaning supplies and janitorial products');

-- Insert sample users with credit limits for all account types
INSERT INTO users (name, email, password_hash, account_type, company_name, credit_limit, credit_used, status) VALUES
('Admin User', 'admin@bizmart.com', '$2b$10$hash', 'business', 'BizMart Admin', 0, 0, 'active'),
('John Doe', 'john@company.com', '$2b$10$hash', 'business', 'Acme Corp', 5000, 1250, 'active'),
('Jane Smith', 'jane@personal.com', '$2b$10$hash', 'personal', NULL, 1500, 350, 'active'),
('Bob Wilson', 'bob@business.com', '$2b$10$hash', 'business', 'Wilson Industries', 10000, 3500, 'active'),
('Alice Johnson', 'alice@personal.com', '$2b$10$hash', 'personal', NULL, 2000, 750, 'active'),
('Mike Chen', 'mike@personal.com', '$2b$10$hash', 'personal', NULL, 1000, 200, 'active'),
('Sarah Davis', 'sarah@company.com', '$2b$10$hash', 'business', 'Davis LLC', 7500, 2100, 'active');

-- Insert sample products
INSERT INTO products (name, sku, description, category_id, price, stock_quantity, status) VALUES
('Premium Copy Paper - 500 Sheets', 'PP-500-001', 'High-quality white copy paper, 20lb weight, perfect for everyday printing', 1, 12.99, 150, 'active'),
('Black Ink Cartridge - HP Compatible', 'INK-HP-001', 'Compatible black ink cartridge for HP printers, high yield', 2, 24.99, 75, 'active'),
('Wireless Mouse - Ergonomic Design', 'TECH-MS-001', 'Comfortable wireless mouse with ergonomic design and long battery life', 4, 19.99, 0, 'out_of_stock'),
('Coffee K-Cups - Variety Pack', 'COFFEE-001', 'Assorted coffee K-cups, 24 count variety pack', 5, 32.99, 89, 'active'),
('Sticky Notes - Assorted Colors', 'OFFICE-001', 'Colorful sticky notes, 3x3 inches, pack of 12 pads', 3, 8.99, 200, 'active'),
('All-Purpose Cleaner - 32oz', 'CLEAN-001', 'Multi-surface cleaner, safe for office use, fresh scent', 6, 6.99, 45, 'active'),
('Laser Printer Paper - Ream', 'PP-LASER-001', 'Premium laser printer paper, 24lb weight, 500 sheets', 1, 15.99, 120, 'active'),
('Color Ink Cartridge Set', 'INK-COLOR-001', 'Tri-color ink cartridge set, compatible with major brands', 2, 39.99, 60, 'active');

-- Insert sample orders
INSERT INTO orders (order_number, user_id, total_amount, payment_method, status, shipping_address, billing_address) VALUES
('ORD-001', 2, 156.99, 'credit_line', 'pending', '123 Business St, City, State 12345', '123 Business St, City, State 12345'),
('ORD-002', 3, 45.50, 'credit_line', 'shipped', '456 Home Ave, City, State 12345', '456 Home Ave, City, State 12345'),
('ORD-003', 4, 299.99, 'credit_line', 'delivered', '789 Corporate Blvd, City, State 12345', '789 Corporate Blvd, City, State 12345'),
('ORD-004', 5, 89.99, 'credit_line', 'processing', '321 Personal St, City, State 12345', '321 Personal St, City, State 12345');

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 5, 12.99, 64.95),
(1, 2, 2, 24.99, 49.98),
(1, 5, 3, 8.99, 26.97),
(2, 4, 1, 32.99, 32.99),
(2, 6, 2, 6.99, 13.98),
(3, 7, 10, 15.99, 159.90),
(3, 8, 3, 39.99, 119.97),
(4, 1, 3, 12.99, 38.97),
(4, 5, 5, 8.99, 44.95);
