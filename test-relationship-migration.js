// Test script to verify relationship-preserving UUID migration
console.log('=== Testing Relationship-Preserving UUID Migration ===');

// UUID validation function
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Generate UUID function (same as helpers.ts)
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Relationship-preserving migration function
const migrateIdsToUUIDs = (allData) => {
  const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Create a mapping of old IDs to new UUIDs to preserve relationships
  const idMapping = new Map();
  
  // Function to get or create UUID for an ID
  const getOrCreateUUID = (oldId) => {
    if (!oldId || typeof oldId !== 'string') return oldId;
    if (isValidUUID(oldId)) return oldId; // Already valid UUID
    
    if (!idMapping.has(oldId)) {
      const newUUID = generateId();
      idMapping.set(oldId, newUUID);
      console.log(`Created UUID mapping: ${oldId} -> ${newUUID}`);
    }
    
    return idMapping.get(oldId);
  };

  // First pass: collect all IDs that need migration
  console.log('Pass 1: Collecting all IDs for migration...');
  
  // Collect main entity IDs
  allData.products.forEach(item => {
    if (item.id && !isValidUUID(item.id)) {
      getOrCreateUUID(item.id);
    }
    if (item.supplierId && !isValidUUID(item.supplierId)) {
      getOrCreateUUID(item.supplierId);
    }
  });
  
  allData.suppliers.forEach(item => {
    if (item.id && !isValidUUID(item.id)) {
      getOrCreateUUID(item.id);
    }
  });
  
  allData.sales.forEach(item => {
    if (item.id && !isValidUUID(item.id)) {
      getOrCreateUUID(item.id);
    }
    if (item.productId && !isValidUUID(item.productId)) {
      getOrCreateUUID(item.productId);
    }
  });
  
  allData.stockMovements.forEach(item => {
    if (item.id && !isValidUUID(item.id)) {
      getOrCreateUUID(item.id);
    }
    if (item.productId && !isValidUUID(item.productId)) {
      getOrCreateUUID(item.productId);
    }
  });
  
  allData.notifications.forEach(item => {
    if (item.id && !isValidUUID(item.id)) {
      getOrCreateUUID(item.id);
    }
  });

  // Second pass: apply migrations with preserved relationships
  console.log('Pass 2: Applying migrations with preserved relationships...');
  
  const migratedData = {
    products: allData.products.map(item => ({
      ...item,
      id: getOrCreateUUID(item.id),
      supplierId: item.supplierId ? getOrCreateUUID(item.supplierId) : item.supplierId
    })),
    
    suppliers: allData.suppliers.map(item => ({
      ...item,
      id: getOrCreateUUID(item.id)
    })),
    
    sales: allData.sales.map(item => ({
      ...item,
      id: getOrCreateUUID(item.id),
      productId: item.productId ? getOrCreateUUID(item.productId) : item.productId
    })),
    
    stockMovements: allData.stockMovements.map(item => ({
      ...item,
      id: getOrCreateUUID(item.id),
      productId: item.productId ? getOrCreateUUID(item.productId) : item.productId
    })),
    
    notifications: allData.notifications.map(item => ({
      ...item,
      id: getOrCreateUUID(item.id)
    }))
  };

  if (idMapping.size > 0) {
    console.log(`Migration completed: ${idMapping.size} IDs migrated with relationships preserved`);
  }

  return migratedData;
};

// Test data with relationships
const testData = {
  products: [
    { id: 'prod_123', name: 'Product A', supplierId: 'sup_456' },
    { id: 'prod_789', name: 'Product B', supplierId: 'sup_456' }
  ],
  suppliers: [
    { id: 'sup_456', name: 'Supplier X' }
  ],
  sales: [
    { id: 'sale_111', productId: 'prod_123', amount: 100 },
    { id: 'sale_222', productId: 'prod_789', amount: 200 }
  ],
  stockMovements: [
    { id: 'stock_333', productId: 'prod_123', type: 'in', quantity: 50 },
    { id: 'stock_444', productId: 'prod_789', type: 'out', quantity: 10 }
  ],
  notifications: [
    { id: 'notif_555', message: 'Test notification' }
  ]
};

console.log('\n=== Original Data ===');
console.log('Products:', testData.products);
console.log('Suppliers:', testData.suppliers);
console.log('Sales:', testData.sales);
console.log('Stock Movements:', testData.stockMovements);

console.log('\n=== Running Migration ===');
const migratedData = migrateIdsToUUIDs(testData);

console.log('\n=== Migrated Data ===');
console.log('Products:', migratedData.products);
console.log('Suppliers:', migratedData.suppliers);
console.log('Sales:', migratedData.sales);
console.log('Stock Movements:', migratedData.stockMovements);

console.log('\n=== Relationship Verification ===');
// Verify that relationships are preserved
const product1 = migratedData.products[0];
const product2 = migratedData.products[1];
const supplier = migratedData.suppliers[0];
const sale1 = migratedData.sales[0];
const sale2 = migratedData.sales[1];
const stock1 = migratedData.stockMovements[0];
const stock2 = migratedData.stockMovements[1];

console.log(`✓ Product 1 supplier relationship: ${product1.supplierId === supplier.id ? 'PRESERVED' : 'BROKEN'}`);
console.log(`✓ Product 2 supplier relationship: ${product2.supplierId === supplier.id ? 'PRESERVED' : 'BROKEN'}`);
console.log(`✓ Sale 1 product relationship: ${sale1.productId === product1.id ? 'PRESERVED' : 'BROKEN'}`);
console.log(`✓ Sale 2 product relationship: ${sale2.productId === product2.id ? 'PRESERVED' : 'BROKEN'}`);
console.log(`✓ Stock 1 product relationship: ${stock1.productId === product1.id ? 'PRESERVED' : 'BROKEN'}`);
console.log(`✓ Stock 2 product relationship: ${stock2.productId === product2.id ? 'PRESERVED' : 'BROKEN'}`);

console.log('\n=== UUID Validation ===');
const allItems = [
  ...migratedData.products,
  ...migratedData.suppliers,
  ...migratedData.sales,
  ...migratedData.stockMovements,
  ...migratedData.notifications
];

allItems.forEach(item => {
  console.log(`${item.name || item.id}: ID ${item.id} is valid UUID: ${isValidUUID(item.id)}`);
  if (item.productId) {
    console.log(`  - productId ${item.productId} is valid UUID: ${isValidUUID(item.productId)}`);
  }
  if (item.supplierId) {
    console.log(`  - supplierId ${item.supplierId} is valid UUID: ${isValidUUID(item.supplierId)}`);
  }
});
