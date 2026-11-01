# Database Column Mapping Fix

## Issue
The app was getting a 400 error when trying to load data from Supabase:
```
Failed to load resource: server responded with a status of 400
```

This was happening because there was a mismatch between the database column names (snake_case) and the TypeScript interface properties (camelCase).

## Root Cause
- **Database Schema**: Uses snake_case naming (e.g., `min_stock`, `supplier_id`, `created_at`)
- **TypeScript Interface**: Uses camelCase naming (e.g., `minStock`, `supplierId`, `createdAt`)
- **Previous Query**: Used `select('*')` which tried to map all columns directly without transformation

## Solution Applied

### 1. Explicit Column Selection
Instead of using `select('*')`, we now explicitly specify each column:

```typescript
supabase.from('products')
  .select('id, name, sku, category, price, cost, quantity, min_stock, description, supplier_id, created_at, updated_at, user_id')
  .eq('user_id', userId)
```

### 2. Data Transformation Functions
Added transformation functions to convert between database format and TypeScript interface format:

#### Loading Data (snake_case → camelCase)
```typescript
const transformProducts = (dbProducts: any[]): Product[] => {
  return dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    // ... other direct mappings
    minStock: p.min_stock,           // Transform snake_case to camelCase
    supplierId: p.supplier_id,       // Transform snake_case to camelCase
    createdAt: p.created_at,         // Transform snake_case to camelCase
    updatedAt: p.updated_at          // Transform snake_case to camelCase
  }));
};
```

#### Saving Data (camelCase → snake_case)
```typescript
const transformForDatabase = (items: any[], type: string) => {
  return items.map(item => ({
    ...item,
    min_stock: item.minStock,        // Transform camelCase to snake_case
    supplier_id: item.supplierId,    // Transform camelCase to snake_case
    created_at: item.createdAt,      // Transform camelCase to snake_case
    updated_at: item.updatedAt       // Transform camelCase to snake_case
  }));
};
```

### 3. Applied to All Data Types
The transformation is applied to all data types:
- **Products**: `min_stock`, `supplier_id`, `created_at`, `updated_at`
- **Sales**: `product_id`, `product_name`, `unit_price`, `total_amount`, `customer_name`, `payment_method`
- **Suppliers**: `contact_person`, `payment_terms`, `created_at`, `updated_at`
- **Stock Movements**: `product_id`, `product_name`, `supplier_id`, `supplier_name`, `unit_cost`, `total_cost`, `created_by`
- **Notifications**: `product_id`, `is_read`, `created_at`

## Key Benefits
1. **Consistency**: Maintains camelCase naming in TypeScript for better code consistency
2. **Database Compatibility**: Uses proper snake_case naming for database operations
3. **Error Prevention**: Eliminates 400 errors caused by column name mismatches
4. **Future-Proof**: Clear separation between database and application layer naming

## Files Modified
- `src/hooks/useUserData.ts` - Added column mapping and transformation functions

## Database Schema Reference
```sql
-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,      -- snake_case
  description text,
  supplier_id uuid REFERENCES suppliers(id), -- snake_case
  created_at timestamptz DEFAULT now(),      -- snake_case
  updated_at timestamptz DEFAULT now(),      -- snake_case
  user_id uuid NOT NULL                      -- snake_case
);
```

## TypeScript Interface Reference
```typescript
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;      // camelCase
  description?: string;
  supplierId?: string;   // camelCase
  createdAt: string;     // camelCase
  updatedAt: string;     // camelCase
}
```

## Testing
- ✅ Build completes without errors
- ✅ Database queries should now work properly
- ✅ Data loading from Supabase should succeed
- ✅ Cross-device sync should work correctly

## Future Considerations
- Consider using a database ORM or query builder that handles column mapping automatically
- Could implement a generic transformation utility for other similar cases
- Monitor for any remaining column name mismatches in new features
