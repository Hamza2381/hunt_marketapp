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
    // Calculate date ranges once
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    
    // Execute all queries in parallel for maximum speed
    const [
      { count: userCount },
      { count: activeUserCount },
      { count: productCount },
      { count: orderCount },
      { data: revenueData },
      { data: adjustmentsData },
      { data: thisMonthData },
      { data: lastMonthData }
    ] = await Promise.all([
      // Total users
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
      
      // Active users (last 30 days)
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }).gte('last_login', thirtyDaysAgo),
      
      // Total products
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
      
      // Total orders
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      
      // Total revenue
      supabaseAdmin.from('orders').select('total_amount'),
      
      // Revenue adjustments
      supabaseAdmin.from('revenue_adjustments').select('amount, adjustment_type'),
      
      // This month revenue
      supabaseAdmin.from('orders').select('total_amount').gte('created_at', firstDayThisMonth),
      
      // Last month revenue
      supabaseAdmin.from('orders').select('total_amount')
        .gte('created_at', firstDayLastMonth)
        .lt('created_at', firstDayThisMonth)
    ]);
    
    // Calculate totals efficiently
    const baseRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    
    // Calculate revenue adjustments (positive adjustments add to revenue, negative reduce it)
    const revenueAdjustments = adjustmentsData?.reduce((sum, adj) => {
      return sum + (adj.adjustment_type === 'add' ? (adj.amount || 0) : -(adj.amount || 0));
    }, 0) || 0;
    
    const totalRevenue = baseRevenue + revenueAdjustments;
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
    };
    
    return NextResponse.json({ 
      success: true,
      stats: stats
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch stats',
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
