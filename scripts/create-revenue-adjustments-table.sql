-- Create revenue_adjustments table for handling completed order revenue preservation
CREATE TABLE IF NOT EXISTS revenue_adjustments (
    id SERIAL PRIMARY KEY,
    adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('add', 'subtract')),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    related_user_id UUID,
    related_order_ids INTEGER[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_revenue_adjustments_type ON revenue_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_revenue_adjustments_user ON revenue_adjustments(related_user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_adjustments_created ON revenue_adjustments(created_at);

-- Enable Row Level Security (if needed)
ALTER TABLE revenue_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to access revenue adjustments
CREATE POLICY "Admins can manage revenue adjustments" ON revenue_adjustments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Grant permissions
GRANT ALL ON revenue_adjustments TO authenticated;
GRANT ALL ON revenue_adjustments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE revenue_adjustments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE revenue_adjustments_id_seq TO service_role;
