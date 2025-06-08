-- Check if the is_featured column already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'products' 
                  AND column_name = 'is_featured') THEN
        -- Add is_featured column to products table
        ALTER TABLE public.products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
        
        -- Add some featured products for testing
        UPDATE public.products SET is_featured = TRUE WHERE id IN (1, 2, 3, 5, 8);
    END IF;
END;
$$;