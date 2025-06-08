# Featured Products Migration

This migration adds a new `is_featured` column to the products table and sets some products as featured for the home page.

## How to Run This Migration

You can run this migration in the Supabase SQL Editor:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `add-featured-products.sql` file
5. Click "Run" to execute the migration

Or you can use the Supabase CLI if you have it set up locally:

```bash
supabase db push --db-url your-supabase-db-url
```

## What This Migration Does

1. Adds an `is_featured` boolean column to the products table (defaults to false)
2. Sets some example products as featured to demonstrate the functionality
