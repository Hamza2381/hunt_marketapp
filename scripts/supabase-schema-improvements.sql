-- Additional improvements to the database schema
-- Run these after the main schema to add improvements

-- Add missing fields to orders table for better tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE;

-- Add last_login tracking to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS temporary_password BOOLEAN DEFAULT FALSE;

-- Add featured products support
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- Function to update last_login when user profile is accessed
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update last_login when the user is actually logging in
    -- (not on every profile update)
    IF TG_OP = 'UPDATE' AND OLD.last_login IS DISTINCT FROM NEW.last_login THEN
        NEW.last_login = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure credit_used doesn't exceed credit_limit
ALTER TABLE public.user_profiles ADD CONSTRAINT IF NOT EXISTS check_credit_limit 
    CHECK (credit_used <= credit_limit);

-- Add constraint to ensure order totals are positive
ALTER TABLE public.orders ADD CONSTRAINT IF NOT EXISTS check_positive_total 
    CHECK (total_amount > 0);

-- Add constraint to ensure order item quantities are positive
ALTER TABLE public.order_items ADD CONSTRAINT IF NOT EXISTS check_positive_quantity 
    CHECK (quantity > 0);

-- Add constraint to ensure order item prices are positive
ALTER TABLE public.order_items ADD CONSTRAINT IF NOT EXISTS check_positive_price 
    CHECK (unit_price >= 0 AND total_price >= 0);

-- Create a function to handle order number generation
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_order_number TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate order number with timestamp and random component
        new_order_number := 'ORD-' || 
                           EXTRACT(epoch FROM NOW())::TEXT || '-' || 
                           LPAD((RANDOM() * 999)::INT::TEXT, 3, '0');
        
        -- Check if this order number already exists
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN
            EXIT;
        END IF;
        
        -- Prevent infinite loop
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique order number after 100 attempts';
        END IF;
    END LOOP;
    
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set estimated delivery date
CREATE OR REPLACE FUNCTION public.set_estimated_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Set estimated delivery to 3 business days from order date
    IF NEW.estimated_delivery IS NULL THEN
        NEW.estimated_delivery = NEW.created_at + INTERVAL '3 days';
    END IF;
    
    -- Auto-generate order number if not provided
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number = generate_order_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for estimated delivery
DROP TRIGGER IF EXISTS set_estimated_delivery_trigger ON orders;
CREATE TRIGGER set_estimated_delivery_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_estimated_delivery();

-- Improved RLS policies for better security

-- Drop and recreate order-related policies with better logic
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Add RLS policy for order_items
DROP POLICY IF EXISTS "Users can view order items for their orders" ON order_items;
CREATE POLICY "Users can view order items for their orders" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE))
        )
    );

CREATE POLICY "Users can create order items for their orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON user_profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- Create a view for order summaries (useful for reporting)
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.user_id,
    o.total_amount,
    o.status,
    o.created_at,
    up.name as customer_name,
    up.email as customer_email,
    up.account_type,
    up.company_name,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.user_id, o.total_amount, o.status, o.created_at,
         up.name, up.email, up.account_type, up.company_name;

-- Grant appropriate permissions
GRANT SELECT ON order_summary TO authenticated;
GRANT ALL ON order_summary TO service_role;

-- Create a function to safely delete users (with proper cleanup)
CREATE OR REPLACE FUNCTION public.safe_delete_user(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    order_count INTEGER;
    result JSON;
BEGIN
    -- Check if user has orders
    SELECT COUNT(*) INTO order_count
    FROM orders
    WHERE user_id = user_uuid;
    
    IF order_count > 0 THEN
        -- Anonymize user instead of deleting
        UPDATE user_profiles
        SET 
            name = '[Deleted User]',
            email = 'deleted_user_' || EXTRACT(epoch FROM NOW()) || '@anonymized.local',
            phone = NULL,
            address_street = NULL,
            address_city = NULL,
            address_state = NULL,
            address_zip = NULL,
            company_name = NULL,
            status = 'inactive',
            updated_at = NOW()
        WHERE id = user_uuid;
        
        result = json_build_object(
            'action', 'anonymized',
            'message', 'User anonymized due to existing orders',
            'order_count', order_count
        );
    ELSE
        -- Safe to delete completely
        DELETE FROM chat_messages WHERE sender_id = user_uuid;
        DELETE FROM chat_conversations WHERE user_id = user_uuid;
        DELETE FROM user_profiles WHERE id = user_uuid;
        
        result = json_build_object(
            'action', 'deleted',
            'message', 'User completely removed',
            'order_count', 0
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins will check in app)
GRANT EXECUTE ON FUNCTION safe_delete_user(UUID) TO authenticated;

-- Add some helpful comments
COMMENT ON TABLE user_profiles IS 'Extended user profile information linked to Supabase auth';
COMMENT ON TABLE orders IS 'Customer orders with payment and delivery tracking';
COMMENT ON TABLE order_items IS 'Individual items within each order';
COMMENT ON COLUMN user_profiles.credit_limit IS 'Maximum credit available to user';
COMMENT ON COLUMN user_profiles.credit_used IS 'Currently used credit amount';
COMMENT ON COLUMN orders.status IS 'Order status: pending, processing, shipped, delivered, cancelled';
COMMENT ON FUNCTION safe_delete_user(UUID) IS 'Safely delete or anonymize user based on order history';

-- Create materialized view for admin dashboard statistics (refresh manually or via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats AS
SELECT 
    'total_users' as metric,
    COUNT(*)::TEXT as value,
    NOW() as last_updated
FROM user_profiles
WHERE status = 'active'

UNION ALL

SELECT 
    'total_orders' as metric,
    COUNT(*)::TEXT as value,
    NOW() as last_updated
FROM orders

UNION ALL

SELECT 
    'total_revenue' as metric,
    COALESCE(SUM(total_amount), 0)::TEXT as value,
    NOW() as last_updated
FROM orders
WHERE status IN ('delivered', 'shipped')

UNION ALL

SELECT 
    'active_products' as metric,
    COUNT(*)::TEXT as value,
    NOW() as last_updated
FROM products
WHERE status = 'active';

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_stats_metric ON admin_stats(metric);

-- Grant permissions
GRANT SELECT ON admin_stats TO authenticated;
GRANT ALL ON admin_stats TO service_role;

-- Function to refresh admin stats (call this periodically)
CREATE OR REPLACE FUNCTION public.refresh_admin_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW admin_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_admin_stats() TO authenticated;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Database schema improvements applied successfully!';
END $$;
