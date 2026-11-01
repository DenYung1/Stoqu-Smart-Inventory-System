// Test script to verify UUID migration logic
// Remove the import since we'll define the functions directly

// Mock data with old short IDs (like the problematic "v93ibkf4h")
const testData = [
  { id: 'v93ibkf4h', name: 'Test Product 1', quantity: 10 },
  { id: 'abc123def', name: 'Test Product 2', supplierId: 'old_supplier_1' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Valid UUID Product' }, // Already valid UUID
];

const testSales = [
  { id: 'sale123', productId: 'v93ibkf4h', totalAmount: 100 },
  { id: 'sale456', productId: 'abc123def', totalAmount: 200 },
];

// UUID validation function
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Generate UUID function (same as helpers.ts)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Migration function (same as useUserData.ts)
const migrateIdsToUUIDs = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const migrateItem = (item) => {
    if (!item || typeof item !== 'object') return item;
    
    const migrated = { ...item };
    
    // Migrate main ID
    if (migrated.id && typeof migrated.id === 'string' && !isValidUUID(migrated.id)) {
      migrated.id = generateUUID();
      console.log(`Migrated ID: ${item.id} -> ${migrated.id}`);
    }
    
    // Migrate product IDs in sales
    if (migrated.productId && typeof migrated.productId === 'string' && !isValidUUID(migrated.productId)) {
      migrated.productId = generateUUID();
      console.log(`Migrated productId: ${item.productId} -> ${migrated.productId}`);
    }
    
    // Migrate supplier IDs in products
    if (migrated.supplierId && typeof migrated.supplierId === 'string' && !isValidUUID(migrated.supplierId)) {
      migrated.supplierId = generateUUID();
      console.log(`Migrated supplierId: ${item.supplierId} -> ${migrated.supplierId}`);
    }
    
    return migrated;
  };

  if (Array.isArray(data)) {
    return data.map(migrateItem);
  } else {
    return migrateItem(data);
  }
};

console.log('=== Testing UUID Migration ===');
console.log('Original test data:', testData);
console.log('Original test sales:', testSales);

console.log('\n=== Running Migration ===');
const migratedProducts = migrateIdsToUUIDs(testData);
const migratedSales = migrateIdsToUUIDs(testSales);

console.log('\n=== Results ===');
console.log('Migrated products:', migratedProducts);
console.log('Migrated sales:', migratedSales);

console.log('\n=== Validation ===');
migratedProducts.forEach(product => {
  console.log(`Product ${product.name}: ID ${product.id} is valid UUID: ${isValidUUID(product.id)}`);
  if (product.supplierId) {
    console.log(`  - Supplier ID ${product.supplierId} is valid UUID: ${isValidUUID(product.supplierId)}`);
  }
});

migratedSales.forEach(sale => {
  console.log(`Sale ${sale.id}: ID is valid UUID: ${isValidUUID(sale.id)}`);
  console.log(`  - Product ID ${sale.productId} is valid UUID: ${isValidUUID(sale.productId)}`);
});
