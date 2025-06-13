import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Database connectivity test starting...')
    
    const results: any = {
      environment: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        supabaseServiceKey: !!supabaseServiceKey,
        nodeEnv: process.env.NODE_ENV
      },
      tests: {}
    }
    
    console.log('Environment check:', results.environment)
    
    // Test 1: Anon client connection
    try {
      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
      const { data: anonTest, error: anonError } = await supabaseAnon
        .from('products')
        .select('count')
        .limit(1)
      
      results.tests.anonConnection = {
        success: !anonError,
        error: anonError ? anonError.message : null,
        data: anonTest ? 'Connected' : null
      }
      
      console.log('✅ Anon connection test:', results.tests.anonConnection.success ? 'PASSED' : 'FAILED')
      
    } catch (error: any) {
      results.tests.anonConnection = {
        success: false,
        error: error.message,
        data: null
      }
      console.log('❌ Anon connection test: FAILED', error.message)
    }
    
    // Test 2: Service role client connection
    if (supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
        
        const { data: adminTest, error: adminError } = await supabaseAdmin
          .from('user_profiles')
          .select('count')
          .limit(1)
        
        results.tests.adminConnection = {
          success: !adminError,
          error: adminError ? adminError.message : null,
          data: adminTest ? 'Connected' : null
        }
        
        console.log('✅ Admin connection test:', results.tests.adminConnection.success ? 'PASSED' : 'FAILED')
        
      } catch (error: any) {
        results.tests.adminConnection = {
          success: false,
          error: error.message,
          data: null
        }
        console.log('❌ Admin connection test: FAILED', error.message)
      }
    } else {
      results.tests.adminConnection = {
        success: false,
        error: 'Service key not available',
        data: null
      }
    }
    
    // Test 3: Products table access
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: productsTest, error: productsError } = await supabase
        .from('products')
        .select('id, name, status')
        .limit(3)
      
      results.tests.productsTable = {
        success: !productsError,
        error: productsError ? productsError.message : null,
        data: productsTest ? `Found ${productsTest.length} products` : null
      }
      
      console.log('✅ Products table test:', results.tests.productsTable.success ? 'PASSED' : 'FAILED')
      
    } catch (error: any) {
      results.tests.productsTable = {
        success: false,
        error: error.message,
        data: null
      }
      console.log('❌ Products table test: FAILED', error.message)
    }
    
    // Test 4: Categories table access
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: categoriesTest, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .limit(3)
      
      results.tests.categoriesTable = {
        success: !categoriesError,
        error: categoriesError ? categoriesError.message : null,
        data: categoriesTest ? `Found ${categoriesTest.length} categories` : null
      }
      
      console.log('✅ Categories table test:', results.tests.categoriesTable.success ? 'PASSED' : 'FAILED')
      
    } catch (error: any) {
      results.tests.categoriesTable = {
        success: false,
        error: error.message,
        data: null
      }
      console.log('❌ Categories table test: FAILED', error.message)
    }
    
    // Test 5: User profiles table access (admin only)
    if (supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
        
        const { data: usersTest, error: usersError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email, is_admin')
          .limit(3)
        
        results.tests.userProfilesTable = {
          success: !usersError,
          error: usersError ? usersError.message : null,
          data: usersTest ? `Found ${usersTest.length} user profiles` : null
        }
        
        console.log('✅ User profiles table test:', results.tests.userProfilesTable.success ? 'PASSED' : 'FAILED')
        
      } catch (error: any) {
        results.tests.userProfilesTable = {
          success: false,
          error: error.message,
          data: null
        }
        console.log('❌ User profiles table test: FAILED', error.message)
      }
    }
    
    // Overall status
    const allTests = Object.values(results.tests)
    const passedTests = allTests.filter((test: any) => test.success).length
    const totalTests = allTests.length
    
    results.summary = {
      passed: passedTests,
      total: totalTests,
      status: passedTests === totalTests ? 'ALL_PASSED' : 'SOME_FAILED'
    }
    
    console.log(`🎯 Database connectivity test completed: ${passedTests}/${totalTests} tests passed`)
    
    return NextResponse.json({
      success: true,
      message: 'Database connectivity test completed',
      ...results
    })
    
  } catch (error: any) {
    console.error('❌ Database connectivity test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Database connectivity test failed'
    }, { status: 500 })
  }
}