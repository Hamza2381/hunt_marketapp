import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

// Create a server-side Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    console.log('Admin: Fetching dashboard statistics...');
    
    // Fetch user count using admin client
    const { count: userCount, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (userError) {
      console.error('Error fetching user count:', userError);
    }
    
    // Fetch active users (logged in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const { count: activeUserCount, error: activeUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', thirtyDaysAgoStr);
    
    if (activeUserError) {
      console.error('Error fetching active user count:', activeUserError);
    }
    
    // Fetch product count using admin client
    const { count: productCount, error: productError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (productError) {
      console.error('Error fetching product count:', productError);
    }
    
    // Fetch order count using admin client (this should now work correctly)
    const { count: orderCount, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (orderError) {
      console.error('Error fetching order count:', orderError);
    }
    
    console.log('Raw counts:', { userCount, productCount, orderCount });
    
    // Fetch total revenue using admin client
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('orders')
      .select('total_amount');
    
    if (revenueError) {
      console.error('Error fetching revenue data:', revenueError);
    }
    
    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    
    // Fetch last month's revenue for growth calculation
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    const { data: thisMonthData, error: thisMonthError } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .gte('created_at', firstDayThisMonth.toISOString());
    
    const { data: lastMonthData, error: lastMonthError } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .gte('created_at', firstDayLastMonth.toISOString())
      .lt('created_at', firstDayThisMonth.toISOString());
    
    if (thisMonthError) {
      console.error('Error fetching this month revenue:', thisMonthError);
    }
    if (lastMonthError) {
      console.error('Error fetching last month revenue:', lastMonthError);
    }
    
    const thisMonthRevenue = thisMonthData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const lastMonthRevenue = lastMonthData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    
    // Calculate growth percentage
    const growthPercentage = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : (thisMonthRevenue > 0 ? 100 : 0);
    
    const stats = {
      totalUsers: userCount || 0,
      totalProducts: productCount || 0,
      totalOrders: orderCount || 0,
      totalRevenue: totalRevenue,
      monthlyGrowth: parseFloat(growthPercentage.toFixed(1)),
      activeUsers: activeUserCount || 0,
      thisMonthOrders: thisMonthData?.length || 0,
      lastMonthOrders: lastMonthData?.length || 0,
    };
    
    console.log('Admin stats calculated:', stats);
    
    return NextResponse.json({ 
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      stats: {
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        activeUsers: 0,
      }
    }, { status: 500 });
  }
}
