# Checkout UUID to Integer Fix

## Root Cause Identified
The error occurs because the `user_id` in the `orders` table is an INTEGER, but we were passing a UUID string. PostgreSQL was trying to convert the UUID (`3790d661-6bc7-4960-85e1-622952d94847`) to an integer, which failed.

## Key Solution Points

1. In the `D:\upwork\source\app\api\checkout\route.ts` file:

   a. Use the numeric version of the user ID when creating an order:
   ```javascript
   const orderData = {
     order_number: orderNumber,
     user_id: parseInt(user.id), // IMPORTANT: Use numeric ID, not UUID
     total_amount: Number(total),
     payment_method: "Credit Line",
     status: "pending",
     shipping_address: shippingAddressString,
     billing_address: billingAddressString
   };
   ```

   b. Same change in the insert statement:
   ```javascript
   const { data, error } = await supabaseAdmin
     .from('orders')
     .insert({
       ...orderData,
       // Force the user_id to be an integer
       user_id: parseInt(user.id)
     })
     .select()
     .single();
   ```

2. If you're still experiencing issues:
   - Check the database schema to verify that `user_id` in the `orders` table is indeed an INTEGER
   - Make sure user.id is a valid number after parsing with parseInt()

## Database Schema Note
If the `orders` table's `user_id` column is designed to reference the `user_profiles` table using an integer ID rather than a UUID, you may need to update other queries throughout the application to handle this relationship properly.

## Long-term Solution
If this fix works, consider modifying the database schema to use UUIDs consistently across all tables, or ensure that user IDs are properly converted to integers where needed.