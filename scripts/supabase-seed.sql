-- Insert categories
INSERT INTO categories (name, description) VALUES
('Paper', 'All types of paper products including copy paper, cardstock, and specialty papers'),
('Ink & Toner', 'Printer cartridges, ink refills, and toner for all major printer brands'),
('Office Supplies', 'Essential office supplies including pens, pencils, staplers, and organizers'),
('Technology', 'Computer accessories, cables, and electronic devices'),
('Coffee & Snacks', 'Break room supplies including coffee, tea, and snacks'),
('Cleaning', 'Cleaning supplies and janitorial products')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, sku, description, category_id, price, stock_quantity, status, image_url) VALUES
('Premium Copy Paper - 500 Sheets', 'PP-500-001', 'High-quality white copy paper, 20lb weight, perfect for everyday printing', 1, 12.99, 150, 'active', '/placeholder.svg?height=300&width=300'),
('Black Ink Cartridge - HP Compatible', 'INK-HP-001', 'Compatible black ink cartridge for HP printers, high yield', 2, 24.99, 75, 'active', '/placeholder.svg?height=300&width=300'),
('Wireless Mouse - Ergonomic Design', 'TECH-MS-001', 'Comfortable wireless mouse with ergonomic design and long battery life', 4, 19.99, 0, 'out_of_stock', '/placeholder.svg?height=300&width=300'),
('Coffee K-Cups - Variety Pack', 'COFFEE-001', 'Assorted coffee K-cups, 24 count variety pack', 5, 32.99, 89, 'active', '/placeholder.svg?height=300&width=300'),
('Sticky Notes - Assorted Colors', 'OFFICE-001', 'Colorful sticky notes, 3x3 inches, pack of 12 pads', 3, 8.99, 200, 'active', '/placeholder.svg?height=300&width=300'),
('All-Purpose Cleaner - 32oz', 'CLEAN-001', 'Multi-surface cleaner, safe for office use, fresh scent', 6, 6.99, 45, 'active', '/placeholder.svg?height=300&width=300'),
('Laser Printer Paper - Ream', 'PP-LASER-001', 'Premium laser printer paper, 24lb weight, 500 sheets', 1, 15.99, 120, 'active', '/placeholder.svg?height=300&width=300'),
('Color Ink Cartridge Set', 'INK-COLOR-001', 'Tri-color ink cartridge set, compatible with major brands', 2, 39.99, 60, 'active', '/placeholder.svg?height=300&width=300'),
('Bluetooth Keyboard', 'TECH-KB-001', 'Slim wireless keyboard with long battery life', 4, 49.99, 30, 'active', '/placeholder.svg?height=300&width=300'),
('Desk Organizer Set', 'OFFICE-002', 'Complete desk organization system with multiple compartments', 3, 24.99, 85, 'active', '/placeholder.svg?height=300&width=300')
ON CONFLICT (sku) DO NOTHING;
