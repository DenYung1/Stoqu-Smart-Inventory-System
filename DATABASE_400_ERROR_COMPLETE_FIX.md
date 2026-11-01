# Database 400 Error Fix - Complete Solution

## Issue Description
The app was encountering a 400 Bad Request error when trying to sync data to Supabase:
```
POST https://jmqxwwsvzwxtbdofyote.supabase.co/rest/v1/products 400 (Bad Request)
```

## Root Cause Analysis
The error was caused by a mismatch between:
1. **TypeScript Interface Properties** (camelCase): `minStock`, `supplierId`, `createdAt`, `updatedAt`
2. **Database Column Names** (snake_case): `min_stock`, `supplier_id`, `created_at`, `updated_at`

The original `syncToSupabase` function was using a spread operator (`...item`) which included both the original camelCase properties AND the snake_case transformations, causing the database to receive invalid column names.

## Problem Code (Before Fix)
```typescript
const transformed = { ...item, user_id: userId }; // ❌ This includes camelCase properties

return {
  ...transformed,              // ❌ Still has minStock, supplierId, etc.
  min_stock: item.minStock,    // ✅ Correct database column
  supplier_id: item.supplierId // ✅ Correct database column
};
```

This resulted in sending data like:
```json
{
  "minStock": 5,        // ❌ Invalid database column
  "min_stock": 5,       // ✅ Valid database column  
  "supplierId": "abc",  // ❌ Invalid database column
  "supplier_id": "abc"  // ✅ Valid database column
}
```

## Solution Applied

### 1. Clean Transformation Functions
Completely rewrote the transformation to explicitly map only the correct columns:

```typescript
const transformForDatabase = (items: any[], type: string) => {
  return items.map(item => {
    const baseTransformed = { user_id: userId }; // Start clean
    
    switch (type) {
      case 'products':
        return {
          ...baseTransformed,
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          price: item.price,
          cost: item.cost,
          quantity: item.quantity,
          min_stock: item.minStock,           // Only snake_case
          description: item.description || null,
          supplier_id: item.supplierId || null, // Only snake_case
          created_at: item.createdAt,         // Only snake_case
          updated_at: item.updatedAt          // Only snake_case
        };
      // ... other cases
    }
  });
};
```

### 2. Proper Nullable Field Handling
Added explicit null handling for optional fields to prevent undefined values:

```typescript
description: item.description || null,      // Handles undefined
supplier_id: item.supplierId || null,       // Handles undefined
customer_name: item.customerName || null,   // Handles undefined
email: item.email || null,                  // Handles undefined
```

### 3. Complete Column Mapping
Applied the fix to all data types:

#### Products Table
- `minStock` → `min_stock`
- `supplierId` → `supplier_id`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

#### Sales Table
- `productId` → `product_id`
- `productName` → `product_name`
- `unitPrice` → `unit_price`
- `totalAmount` → `total_amount`
- `customerName` → `customer_name`
- `paymentMethod` → `payment_method`

#### Suppliers Table
- `contactPerson` → `contact_person`
- `paymentTerms` → `payment_terms`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

#### Stock Movements Table
- `productId` → `product_id`
- `productName` → `product_name`
- `supplierId` → `supplier_id`
- `supplierName` → `supplier_name`
- `unitCost` → `unit_cost`
- `totalCost` → `total_cost`
- `createdBy` → `created_by`

#### Notifications Table
- `productId` → `product_id`
- `isRead` → `is_read`
- `createdAt` → `created_at`

## Database Schema Reference
```sql
-- Products table columns (snake_case)
CREATE TABLE products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  description text,
  supplier_id uuid REFERENCES suppliers(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);
```

## TypeScript Interface Reference
```typescript
// Product interface (camelCase)
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

## Benefits of the Fix
1. **Error Elimination**: Resolves all 400 Bad Request errors during data sync
2. **Data Integrity**: Ensures only valid database columns are sent
3. **Type Safety**: Maintains TypeScript interface consistency
4. **Null Safety**: Proper handling of optional/nullable fields
5. **Performance**: Cleaner data structure reduces payload size

## Testing Results
- ✅ Build completes without errors
- ✅ Database insertions now work properly
- ✅ Cross-device sync functions correctly
- ✅ No more 400 errors in browser console
- ✅ Data loading and saving work seamlessly

## Files Modified
- `src/hooks/useUserData.ts` - Complete rewrite of transformation functions

## Future Maintenance
- When adding new fields, ensure proper camelCase ↔ snake_case mapping
- Always test database operations after schema changes
- Consider using a database ORM that handles column mapping automatically
- Monitor for any remaining column name mismatches in new features

## Debugging Tips
If similar issues occur:
1. Check browser Network tab for the actual request payload
2. Verify database column names match the transformed data
3. Ensure nullable fields are handled with `|| null`
4. Test with minimal data first before full sync
