-- Seed data for testing

-- Insert sample products
INSERT INTO products (name, description, price, stock) VALUES
('Laptop Pro 15"', 'High-performance laptop with 16GB RAM', 1299.99, 50),
('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 29.99, 200),
('Mechanical Keyboard', 'RGB mechanical keyboard with Cherry MX switches', 149.99, 75),
('USB-C Hub', '7-in-1 USB-C hub with HDMI and ethernet', 49.99, 150),
('Laptop Stand', 'Adjustable aluminum laptop stand', 39.99, 100),
('Webcam HD', '1080p HD webcam with microphone', 79.99, 80),
('Headphones', 'Noise-cancelling wireless headphones', 299.99, 60),
('Monitor 27"', '4K IPS monitor with USB-C', 449.99, 30),
('External SSD 1TB', 'Portable external SSD with USB 3.2', 119.99, 120),
('Desk Lamp', 'LED desk lamp with touch control', 34.99, 90);

-- Insert sample coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, max_uses_per_user, valid_until, is_active) VALUES
('WELCOME10', '10% off for new customers', 'percentage', 10.00, 50.00, 50.00, 100, 1, NOW() + INTERVAL '30 days', true),
('SAVE20', '$20 off orders over $100', 'fixed', 20.00, 100.00, NULL, 50, 1, NOW() + INTERVAL '60 days', true),
('BIGSALE', '25% off everything', 'percentage', 25.00, 0.00, 100.00, NULL, 2, NOW() + INTERVAL '7 days', true),
('EXPIRED', 'Expired coupon', 'percentage', 50.00, 0.00, NULL, NULL, 1, NOW() - INTERVAL '1 day', true),
('INACTIVE', 'Inactive coupon', 'percentage', 30.00, 0.00, NULL, NULL, 1, NOW() + INTERVAL '30 days', false);

-- Note: Users will be created through the registration endpoint
-- Note: Orders will be created through the order creation endpoint

