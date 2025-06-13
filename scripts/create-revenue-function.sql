-- Create optimized function for total revenue calculation
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS TABLE(total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(SUM(total_amount), 0)::DECIMAL as total
    FROM orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_total_revenue() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_revenue() TO service_role;
