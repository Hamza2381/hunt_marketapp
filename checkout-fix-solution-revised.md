# Checkout Foreign Key Constraint Fix

## Root Cause Identified
The error was a foreign key constraint violation: `"orders_user_id_fkey"`.

Our initial assumption was incorrect. The `user_id` column in the `orders` table is NOT an integer but a UUID that references user records directly. When we tried to convert the UUID to an integer, it broke the foreign key relationship.

## Correct Solution

1. In the `D:\upwork\source\app\api\checkout\route.ts` file:

   a. Use the UUID directly for the user_id field:
   ```javascript
   const orderData = {
     order_number: orderNumber,
     user_id: userId, // IMPORTANT: Use the UUID directly (do NOT parse as integer)
     total_amount: Number(total),
     payment_method: "Credit Line",
     status: "pending",
     shipping_address: shippingAddressString,
     billing_address: billingAddressString
   };
   ```

   b. Same in the insert statement:
   ```javascript
   const { data, error } = await supabaseAdmin
     .from('orders')
     .insert({
       ...orderData,
       // Use the UUID directly without conversion
       user_id: userId 
     })
     .select()
     .single();
   ```

## Database Schema Understanding
The foreign key relationship in the database is:
- `orders.user_id` -> `auth.users.id` (or similar table)
- The referenced column is a UUID, not an integer

## Key Learning
When working with UUIDs and foreign keys, always ensure the data type matches exactly what the database expects. In this case, the user ID needed to remain a UUID string for the foreign key constraint to be satisfied.