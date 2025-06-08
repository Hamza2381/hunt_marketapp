# UUID Error Fix

The issue is that the user's UUID is being treated as an integer in a database operation. Here's the fix:

1. Open `D:\upwork\source\app\api\checkout\route.ts`
2. Find the section where `orderData` is created (around line 126-136)
3. Replace it with this code:

```javascript
// Explicitly create the order data object with careful type handling
const orderData = {
  order_number: orderNumber,
  // Cast user_id to text explicitly to avoid PostgreSQL type issues
  user_id: userId.toString(),
  total_amount: Number(total),
  payment_method: "Credit Line",
  status: "pending",
  shipping_address: shippingAddressString,
  billing_address: billingAddressString
};
```

4. Also check the database schema in `scripts/supabase-schema.sql` to verify the orders table has:
```sql
user_id UUID REFERENCES auth.users(id)
```

5. If the database schema is correct, you might need to add a type cast in the Supabase query:
```javascript
const { data, error } = await supabaseAdmin
  .from('orders')
  .insert({
    ...orderData,
    user_id: userId.toString() // Ensure it's treated as a string/text
  })
  .select()
  .single();
```

The issue is that PostgreSQL is trying to convert the UUID string to an integer, which fails. This usually happens when there's a mismatch between how the column is defined and how it's being used in the query.