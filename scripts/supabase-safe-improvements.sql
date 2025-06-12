-- SAFE Schema Improvements - Won't conflict with existing RLS policies
-- This version skips RLS policy changes and focuses on essential improvements

-- Add missing fields to orders table for better tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE;

-- Add last_login tracking to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS temporary_password BOOLEAN DEFAULT FALSE;

-- Add featured products support
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance on new fields (safe to add)
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- Add performance indexes (safe to add)
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON user_profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- Add safe constraints (these might fail if data violates them, but won't remove data)
DO $$ 
BEGIN
    -- Add constraint to ensure order totals are positive
    BEGIN
        ALTER TABLE public.orders ADD CONSTRAINT check_positive_total CHECK (total_amount > 0);
        RAISE NOTICE 'Added positive total constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Positive total constraint already exists';
    END;
    
    -- Add constraint to ensure order item quantities are positive
    BEGIN
        ALTER TABLE public.order_items ADD CONSTRAINT check_positive_quantity CHECK (quantity > 0);
        RAISE NOTICE 'Added positive quantity constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Positive quantity constraint already exists';
    END;
    
    -- Add constraint to ensure order item prices are positive
    BEGIN
        ALTER TABLE public.order_items ADD CONSTRAINT check_positive_price CHECK (unit_price >= 0 AND total_price >= 0);
        RAISE NOTICE 'Added positive price constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Positive price constraint already exists';
    END;
END $$;

-- Create helpful functions (safe to add)
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

-- Add some helpful comments
COMMENT ON TABLE user_profiles IS 'Extended user profile information linked to Supabase auth';
COMMENT ON TABLE orders IS 'Customer orders with payment and delivery tracking';
COMMENT ON TABLE order_items IS 'Individual items within each order';
COMMENT ON COLUMN user_profiles.credit_limit IS 'Maximum credit available to user';
COMMENT ON COLUMN user_profiles.credit_used IS 'Currently used credit amount';
COMMENT ON COLUMN orders.status IS 'Order status: pending, processing, shipped, delivered, cancelled';

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE '=================================';
    RAISE NOTICE 'SAFE Database improvements applied!';
    RAISE NOTICE 'No existing data was modified.';
    RAISE NOTICE 'No RLS policies were changed.';
    RAISE NOTICE '=================================';
END $$;
