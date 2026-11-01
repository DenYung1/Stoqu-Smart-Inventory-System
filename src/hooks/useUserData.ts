import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateId } from '../utils/helpers';
import { isAdminUser } from '../utils/adminAccess';
import type { Database } from '../lib/database.types';
import type { Product, Sale, Supplier, StockMovement, Notification, Settings as SettingsType } from '../types';

type UserDataType = 'products' | 'sales' | 'suppliers' | 'stock_movements' | 'notifications' | 'settings';
type UserDataItem = Product | Sale | Supplier | StockMovement | Notification;
type SyncData = UserDataItem[] | SettingsType;
type DatabaseRecord = Record<string, unknown>;
type SettingsUser = {
  id?: string;
  email?: string | null;
  user_metadata?: {
    business_name?: string;
    owner_name?: string;
  } | null;
};

const isDevelopment = import.meta.env.DEV;

const safeConsole = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      globalThis.console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      globalThis.console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      globalThis.console.error(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      globalThis.console.info(...args);
    }
  },
};

// Default settings for new users
const getDefaultSettings = (user: SettingsUser | null): SettingsType => ({
  businessName: user?.user_metadata?.business_name || 'My Business',
  ownerName: user?.user_metadata?.owner_name || 'Business Owner',
  phone: '',
  email: user?.email || '',
  address: '',
  currency: 'GHS',
  taxRate: 12.5,
  lowStockThreshold: 5,
  autoBackup: true,
  notifications: {
    lowStock: true,
    dailySummary: true,
    weeklyReport: true,
  },
});

// Generate user-specific storage keys
const getUserStorageKey = (userId: string, dataType: string) => {
  return `stoqu_${userId}_${dataType}`;
};

// Clear any old global storage keys (migration cleanup)
const clearGlobalStorageKeys = () => {
  const globalKeys = [
    'stoqu-products',
    'stoqu-sales', 
    'stoqu-suppliers',
    'stoqu-stock-movements',
    'stoqu-notifications',
    'stoqu-settings'
  ];
  
  globalKeys.forEach(key => {
    localStorage.removeItem(key);
  });
};

// UUID migration function that preserves foreign key relationships
const migrateIdsToUUIDs = (allData: {
  products: Product[],
  sales: Sale[],
  suppliers: Supplier[],
  stockMovements: StockMovement[],
  notifications: Notification[]
}): typeof allData => {
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Create a mapping of old IDs to new UUIDs to preserve relationships
  const idMapping = new Map<string, string>();
  
  // Function to get or create UUID for an ID
  const getOrCreateUUID = (oldId: string): string => {
    if (!oldId || typeof oldId !== 'string') return oldId;
    if (isValidUUID(oldId)) return oldId; // Already valid UUID
    
    if (!idMapping.has(oldId)) {
      const newUUID = generateId();
      idMapping.set(oldId, newUUID);
      safeConsole.log(`Created UUID mapping: ${oldId} -> ${newUUID}`);
    }
    
    return idMapping.get(oldId)!;
  };

  // First pass: collect all IDs that need migration
  safeConsole.log('Pass 1: Collecting all IDs for migration...');
  
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
  safeConsole.log('Pass 2: Applying migrations with preserved relationships...');
  
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
    safeConsole.log(`Migration completed: ${idMapping.size} IDs migrated with relationships preserved`);
  }

  return migratedData;
};

// Supabase sync functions for cross-device data sync
const syncToSupabase = async (userId: string, dataType: UserDataType, data: SyncData) => {
  if (!userId || !data) return;
  
  try {
    // Syncing data - don't log user IDs in production for privacy
    
    // Transform data from camelCase to snake_case before saving
    const transformForDatabase = (items: UserDataItem[], type: UserDataType): DatabaseRecord[] => {
      return items.map(item => {
        // Start with a base object that includes user_id
        const baseTransformed = { user_id: userId };
        
        switch (type) {
          case 'products':
            {
              const product = item as Product;
            return {
              ...baseTransformed,
              id: product.id,
              name: product.name,
              sku: product.sku,
              category: product.category,
              price: product.price,
              cost: product.cost,
              quantity: product.quantity,
              min_stock: product.minStock,
              description: product.description || null,
              supplier_id: product.supplierId || null,
              created_at: product.createdAt,
              updated_at: product.updatedAt
            };
            }
          case 'sales':
            {
              const sale = item as Sale;
            return {
              ...baseTransformed,
              id: sale.id,
              product_id: sale.productId,
              product_name: sale.productName,
              quantity: sale.quantity,
              unit_price: sale.unitPrice,
              total_amount: sale.totalAmount,
              customer_name: sale.customerName || null,
              payment_method: sale.paymentMethod || null,
              date: sale.date
            };
            }
          case 'suppliers':
            {
              const supplier = item as Supplier;
            return {
              ...baseTransformed,
              id: supplier.id,
              name: supplier.name,
              contact_person: supplier.contactPerson,
              phone: supplier.phone,
              email: supplier.email || null,
              address: supplier.address || null,
              payment_terms: supplier.paymentTerms || null,
              notes: supplier.notes || null,
              created_at: supplier.createdAt,
              updated_at: supplier.updatedAt
            };
            }
          case 'stock_movements':
            {
              const movement = item as StockMovement;
            return {
              ...baseTransformed,
              id: movement.id,
              product_id: movement.productId,
              product_name: movement.productName,
              type: movement.type,
              quantity: movement.quantity,
              reason: movement.reason,
              reference: movement.reference || null,
              supplier_id: movement.supplierId || null,
              supplier_name: movement.supplierName || null,
              unit_cost: movement.unitCost || null,
              total_cost: movement.totalCost || null,
              date: movement.date,
              created_by: movement.createdBy
            };
            }
          case 'notifications':
            {
              const notification = item as Notification;
            return {
              ...baseTransformed,
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              product_id: notification.productId || null,
              is_read: notification.isRead,
              priority: notification.priority,
              created_at: notification.createdAt
            };
            }
          case 'settings': {
            const settings = item as unknown as SettingsType;
            return {
              ...baseTransformed,
              business_name: settings.businessName,
              owner_name: settings.ownerName,
              phone: settings.phone,
              email: settings.email || null,
              address: settings.address || null,
              currency: settings.currency,
              tax_rate: settings.taxRate,
              low_stock_threshold: settings.lowStockThreshold,
              auto_backup: settings.autoBackup,
              notifications_low_stock: settings.notifications.lowStock,
              notifications_daily_summary: settings.notifications.dailySummary,
              notifications_weekly_report: settings.notifications.weeklyReport
            };
          }
          default:
            return { ...item, user_id: userId };
        }
      });
    };

    const dataWithUserId = Array.isArray(data) 
      ? transformForDatabase(data, dataType)
      : dataType === 'settings' 
        ? {
            user_id: userId,
            id: data.id,
            business_name: data.businessName || 'My Business',
            owner_name: data.ownerName || 'Business Owner',
            phone: data.phone || '',
            email: data.email || null,
            address: data.address || null,
            currency: data.currency || 'GHS',
            tax_rate: data.taxRate || 12.5,
            low_stock_threshold: data.lowStockThreshold || 5,
            auto_backup: data.autoBackup !== undefined ? data.autoBackup : true,
            notifications_low_stock: data.notifications?.lowStock !== undefined ? data.notifications.lowStock : true,
            notifications_daily_summary: data.notifications?.dailySummary !== undefined ? data.notifications.dailySummary : true,
            notifications_weekly_report: data.notifications?.weeklyReport !== undefined ? data.notifications.weeklyReport : true,
            updated_at: new Date().toISOString()
          }
        : { ...data, user_id: userId };

    // Add debugging to see what we're trying to insert
    safeConsole.log(`Attempting to sync ${dataType} with data:`, {
      dataType,
      userId,
      sampleItem: Array.isArray(dataWithUserId) ? dataWithUserId[0] : dataWithUserId,
      itemCount: Array.isArray(dataWithUserId) ? dataWithUserId.length : 1
    });

    switch (dataType) {
      case 'products':
      case 'suppliers':
        // For products and suppliers, use upsert directly (no foreign key dependencies)
        if (Array.isArray(dataWithUserId) && dataWithUserId.length > 0) {
          safeConsole.log(`Upserting ${dataWithUserId.length} ${dataType} records`);
          const { data: upsertData, error: upsertError } = await supabase.from(dataType).upsert(dataWithUserId, {
            onConflict: 'id'
          });
          
          if (upsertError) {
            safeConsole.error(`Upsert error for ${dataType}:`, upsertError);
            throw upsertError;
          }
          
          safeConsole.log(`Successfully upserted ${dataType}:`, upsertData);
        }
        break;
      case 'sales':
      case 'stock_movements':
      case 'notifications':
        // For data with foreign key dependencies, filter out invalid references
        if (Array.isArray(dataWithUserId) && dataWithUserId.length > 0) {
          safeConsole.log(`Filtering and upserting ${dataWithUserId.length} ${dataType} records...`);
          
          // Get existing products for this user to validate foreign keys
          const { data: existingProducts, error: productsQueryError } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', userId);
          
          if (productsQueryError) {
            safeConsole.error(`Error querying existing products for ${dataType}:`, productsQueryError);
            throw productsQueryError;
          }
          
          const existingProductIds = new Set(existingProducts?.map(p => p.id) || []);
          
          // Filter out records that reference non-existent products
          const validRecords = dataWithUserId.filter(record => {
            if (dataType === 'notifications' && !record.product_id) {
              return true; // Notifications without product_id are always valid
            }
            
            const productId = record.product_id;
            if (!productId) return true; // Records without product_id are valid
            
            const hasValidProduct = existingProductIds.has(productId);
            if (!hasValidProduct) {
              safeConsole.warn(`Skipping ${dataType} record ${record.id} - product ${productId} not found in database`);
            }
            return hasValidProduct;
          });
          
          if (validRecords.length > 0) {
            safeConsole.log(`Upserting ${validRecords.length} valid ${dataType} records (filtered from ${dataWithUserId.length})`);
            const { data: upsertData, error: upsertError } = await supabase.from(dataType).upsert(validRecords, {
              onConflict: 'id'
            });
            
            if (upsertError) {
              safeConsole.error(`Upsert error for ${dataType}:`, upsertError);
              throw upsertError;
            }
            
            safeConsole.log(`Successfully upserted ${dataType}:`, upsertData);
          } else {
            safeConsole.log(`⚠️ No valid ${dataType} records to upsert (all filtered out due to missing products)`);
          }
        }
        break;
      case 'settings': {
        // For settings, use upsert
        safeConsole.log(`Upserting settings for user ${userId}`);
        const { data: upsertData, error: upsertError } = await supabase.from(dataType).upsert(dataWithUserId, {
          onConflict: 'user_id'
        });
        
        if (upsertError) {
          safeConsole.error(`Upsert error for ${dataType}:`, upsertError);
          throw upsertError;
        }
        
        safeConsole.log(`Successfully upserted ${dataType}:`, upsertData);
        break;
      }
    }
    
    safeConsole.log(`Successfully synced ${dataType} to Supabase`);
  } catch (error) {
    safeConsole.error(`Error syncing ${dataType} to Supabase:`, error);
    
    // Check if it's a schema-related error (column doesn't exist)
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message).toLowerCase();
      if (errorMessage.includes('column') && errorMessage.includes('user_id')) {
        safeConsole.warn(`Database schema missing user_id column for ${dataType}. Skipping sync for now.`);
        safeConsole.info('Please run the COMPREHENSIVE_DATABASE_FIX.sql script in your Supabase SQL editor.');
        return; // Don't throw error, just skip sync
      }
    }
    
    // For other errors, don't throw to prevent app from breaking
    safeConsole.warn(`Sync failed for ${dataType}, but continuing...`);
  }
};

// Type for Supabase data structure
interface SupabaseData {
  products: Product[];
  sales: Sale[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
  notifications: Notification[];
  settings: SettingsType | null;
}

const loadFromSupabase = async (userId: string): Promise<SupabaseData> => {
  try {
    safeConsole.log('Fetching data from Supabase for user:', userId);

    // Step 1: Load settings first as it's critical
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      safeConsole.error('Error loading settings:', settingsError);
      throw settingsError;
    }

    // Transform settings from snake_case to camelCase
    const settingsRow = settingsData as Database['public']['Tables']['settings']['Row'] | null;
    const transformedSettings = settingsRow ? {
      businessName: settingsRow.business_name || '',
      ownerName: settingsRow.owner_name || '',
      phone: settingsRow.phone || '',
      email: settingsRow.email || '',
      address: settingsRow.address || '',
      currency: settingsRow.currency || 'GHS',
      taxRate: settingsRow.tax_rate || 12.5,
      lowStockThreshold: settingsRow.low_stock_threshold || 5,
      autoBackup: settingsRow.auto_backup || false,
      notifications: {
        lowStock: settingsRow.notifications_low_stock || false,
        dailySummary: settingsRow.notifications_daily_summary || false,
        weeklyReport: settingsRow.notifications_weekly_report || false,
      }
    } : null;

    // Load other data in parallel after settings
    const [
      { data: productsData, error: productsError },
      { data: salesData, error: salesError },
      { data: suppliersData, error: suppliersError },
      { data: stockMovementsData, error: stockMovementsError },
      { data: notificationsData, error: notificationsError }
    ] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', userId),
      supabase.from('sales').select('*').eq('user_id', userId),
      supabase.from('suppliers').select('*').eq('user_id', userId),
      supabase.from('stock_movements').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId)
    ]);

    if (productsError) throw productsError;
    if (salesError) throw salesError;
    if (suppliersError) throw suppliersError;
    if (stockMovementsError) throw stockMovementsError;
    if (notificationsError) throw notificationsError;

    // Transform the data to the correct format
    const productsRows = (productsData || []) as Database['public']['Tables']['products']['Row'][];
    const salesRows = (salesData || []) as Database['public']['Tables']['sales']['Row'][];
    const suppliersRows = (suppliersData || []) as Database['public']['Tables']['suppliers']['Row'][];
    const stockMovementsRows = (stockMovementsData || []) as Database['public']['Tables']['stock_movements']['Row'][];
    const notificationsRows = (notificationsData || []) as Database['public']['Tables']['notifications']['Row'][];

    const transformedProducts = productsRows.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      cost: p.cost,
      quantity: p.quantity,
      minStock: p.min_stock,
      description: p.description || undefined,
      supplierId: p.supplier_id || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    const transformedSales = salesRows.map(s => ({
      id: s.id,
      productId: s.product_id || '',
      productName: s.product_name,
      quantity: s.quantity,
      unitPrice: s.unit_price,
      totalAmount: s.total_amount,
      customerName: s.customer_name || undefined,
      paymentMethod: s.payment_method === 'cash' || s.payment_method === 'momo' ||
        s.payment_method === 'card' || s.payment_method === 'credit'
        ? s.payment_method
        : undefined,
      date: s.date
    }));

    const transformedSuppliers = suppliersRows.map(s => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contact_person,
      phone: s.phone,
      email: s.email || undefined,
      address: s.address || undefined,
      paymentTerms: s.payment_terms || undefined,
      notes: s.notes || undefined,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    const transformedStockMovements = stockMovementsRows.map(m => ({
      id: m.id,
      productId: m.product_id || '',
      productName: m.product_name,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      reference: m.reference || undefined,
      supplierId: m.supplier_id || undefined,
      supplierName: m.supplier_name || undefined,
      unitCost: m.unit_cost || undefined,
      totalCost: m.total_cost || undefined,
      date: m.date,
      createdBy: m.created_by
    }));

    const transformedNotifications = notificationsRows.map(n => ({
      id: n.id,
      type: n.type === 'low_stock' || n.type === 'reorder' || n.type === 'sale' || n.type === 'system'
        ? n.type
        : 'system',
      title: n.title,
      message: n.message,
      productId: n.product_id || undefined,
      isRead: n.is_read,
      priority: n.priority === 'low' || n.priority === 'medium' || n.priority === 'high'
        ? n.priority
        : 'low',
      createdAt: n.created_at
    }));

    safeConsole.log('Successfully loaded data from Supabase:', {
      settingsFound: !!transformedSettings,
      products: transformedProducts.length,
      sales: transformedSales.length,
      suppliers: transformedSuppliers.length,
      stockMovements: transformedStockMovements.length,
      notifications: transformedNotifications.length
    });

    return {
      settings: transformedSettings,
      products: transformedProducts,
      sales: transformedSales,
      suppliers: transformedSuppliers,
      stockMovements: transformedStockMovements,
      notifications: transformedNotifications
    };
  } catch (error) {
    safeConsole.error('Error in loadFromSupabase:', error);
    throw error;
  }
};

const migrateLocalStorageToSupabase = async (userId: string) => {
  try {
    safeConsole.log('Checking if migration is needed for user:', userId);
    
    // Make migration non-blocking by using a timeout
    const migrationPromise = Promise.race([
      performMigration(userId),
      new Promise<null>(resolve => setTimeout(() => {
        safeConsole.log('Migration timed out after 5 seconds, continuing...');
        resolve(null);
      }, 5000))
    ]);

    await migrationPromise;
  } catch (error) {
    safeConsole.error('Error during migration (non-blocking):', error);
    // Don't throw error to prevent app from breaking
  }
};

const performMigration = async (userId: string) => {
  // Check if user already has data in Supabase
  try {
    const { data: existingSettings, error: settingsError } = await supabase
      .from('settings')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      safeConsole.warn('Error checking existing settings, proceeding with migration:', settingsError);
    } else if (existingSettings) {
      safeConsole.log('User already has data in Supabase, skipping migration');
      return;
    }
  } catch (error) {
    safeConsole.warn('Error checking existing settings, proceeding with migration:', error);
  }

  // Check if user has localStorage data to migrate
  const localProducts = localStorage.getItem(getUserStorageKey(userId, 'products'));
  const localSales = localStorage.getItem(getUserStorageKey(userId, 'sales'));
  const localSuppliers = localStorage.getItem(getUserStorageKey(userId, 'suppliers'));
  const localStockMovements = localStorage.getItem(getUserStorageKey(userId, 'stock_movements'));
  const localNotifications = localStorage.getItem(getUserStorageKey(userId, 'notifications'));
  const localSettings = localStorage.getItem(getUserStorageKey(userId, 'settings'));

  const hasLocalData = localProducts || localSales || localSuppliers || 
                      localStockMovements || localNotifications || localSettings;

  if (!hasLocalData) {
    safeConsole.log('No local data to migrate');
    return;
  }

  safeConsole.log('Starting migration from localStorage to Supabase...');

  // Parse all local data
  const parsedProducts = localProducts ? JSON.parse(localProducts) : [];
  const parsedSales = localSales ? JSON.parse(localSales) : [];
  const parsedSuppliers = localSuppliers ? JSON.parse(localSuppliers) : [];
  const parsedStockMovements = localStockMovements ? JSON.parse(localStockMovements) : [];
  const parsedNotifications = localNotifications ? JSON.parse(localNotifications) : [];
  const parsedSettings = localSettings ? JSON.parse(localSettings) : getDefaultSettings({ id: userId });

  // Use dependency-aware sync to migrate all data together
  await syncAllUserDataWithDependencies(userId, {
    products: parsedProducts,
    sales: parsedSales,
    suppliers: parsedSuppliers,
    stockMovements: parsedStockMovements,
    notifications: parsedNotifications,
    settings: parsedSettings
  });

  safeConsole.log('Migration completed successfully!');
};

// Sync all user data to Supabase with proper foreign key dependency order using upserts
const syncAllUserDataWithDependencies = async (userId: string, data: {
  products: Product[],
  sales: Sale[],
  suppliers: Supplier[],
  stockMovements: StockMovement[],
  notifications: Notification[],
  settings: SettingsType
}) => {
  if (!userId) return;
  
  try {
    safeConsole.log('Starting ordered upsert sync to respect foreign key dependencies...');
    
    // Use upserts in dependency order with proper awaits to ensure each step completes
    // This prevents foreign key constraint violations
    
    // Step 1: Suppliers first (no dependencies)
    if (data.suppliers && data.suppliers.length > 0) {
      safeConsole.log(`Upserting ${data.suppliers.length} suppliers...`);
      const suppliersData = data.suppliers.map(item => ({
        user_id: userId,
        id: item.id,
        name: item.name,
        contact_person: item.contactPerson,
        phone: item.phone,
        email: item.email || null,
        address: item.address || null,
        payment_terms: item.paymentTerms || null,
        notes: item.notes || null,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      }));
      
      const { error: suppliersError } = await supabase.from('suppliers').upsert(suppliersData, {
        onConflict: 'id'
      });
      if (suppliersError) {
        safeConsole.error('Suppliers upsert error:', suppliersError);
        throw suppliersError;
      }
      safeConsole.log('✅ Suppliers upserted successfully');
      
      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 2: Products second (depends on suppliers)
    if (data.products && data.products.length > 0) {
      safeConsole.log(`Upserting ${data.products.length} products...`);
      const productsData = data.products.map(item => ({
        user_id: userId,
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        price: item.price,
        cost: item.cost,
        quantity: item.quantity,
        min_stock: item.minStock,
        description: item.description || null,
        supplier_id: item.supplierId || null,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      }));
      
      const { error: productsError } = await supabase.from('products').upsert(productsData, {
        onConflict: 'id'
      });
      if (productsError) {
        safeConsole.error('Products upsert error:', productsError);
        throw productsError;
      }
      safeConsole.log('✅ Products upserted successfully');
      
      // Small delay to ensure database commit before dependent operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 3: Sales third (depends on products) - Filter out sales with missing products
    if (data.sales && data.sales.length > 0) {
      safeConsole.log(`Preparing ${data.sales.length} sales for upsert...`);
      
      // Query database to get actual existing products for this user
      const { data: existingProducts, error: productsQueryError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);
      
      if (productsQueryError) {
        safeConsole.error('Error querying existing products:', productsQueryError);
        throw productsQueryError;
      }
      
      const existingProductIds = new Set(existingProducts?.map(p => p.id) || []);
      safeConsole.log(`Found ${existingProductIds.size} existing products in database`);
      
      // Filter out sales that reference non-existent products
      const validSales = data.sales.filter(sale => {
        const hasValidProduct = existingProductIds.has(sale.productId);
        if (!hasValidProduct) {
          safeConsole.warn(`Skipping sale ${sale.id} - product ${sale.productId} not found in database`);
        }
        return hasValidProduct;
      });
      
      if (validSales.length > 0) {
        safeConsole.log(`Upserting ${validSales.length} valid sales (filtered from ${data.sales.length})...`);
        const salesData = validSales.map(item => ({
          user_id: userId,
          id: item.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: item.totalAmount,
          customer_name: item.customerName || null,
          payment_method: item.paymentMethod || null,
          date: item.date
        }));
        
        const { error: salesError } = await supabase.from('sales').upsert(salesData, {
          onConflict: 'id'
        });
        if (salesError) {
          safeConsole.error('Sales upsert error:', salesError);
          throw salesError;
        }
        safeConsole.log('✅ Sales upserted successfully');
      } else {
        safeConsole.log('⚠️ No valid sales to upsert (all filtered out due to missing products)');
      }
      
      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 4: Stock movements fourth (depends on products and suppliers) - Filter out invalid references
    if (data.stockMovements && data.stockMovements.length > 0) {
      safeConsole.log(`Preparing ${data.stockMovements.length} stock movements for upsert...`);
      
      // Query database to get actual existing products for this user
      const { data: existingProducts, error: productsQueryError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);
      
      if (productsQueryError) {
        safeConsole.error('Error querying existing products for stock movements:', productsQueryError);
        throw productsQueryError;
      }
      
      const existingProductIds = new Set(existingProducts?.map(p => p.id) || []);
      safeConsole.log(`Found ${existingProductIds.size} existing products for stock movements filtering`);
      
      // Filter out stock movements that reference non-existent products
      const validStockMovements = data.stockMovements.filter(movement => {
        const hasValidProduct = existingProductIds.has(movement.productId);
        if (!hasValidProduct) {
          safeConsole.warn(`Skipping stock movement ${movement.id} - product ${movement.productId} not found in database`);
        }
        return hasValidProduct;
      });
      
      if (validStockMovements.length > 0) {
        safeConsole.log(`Upserting ${validStockMovements.length} valid stock movements (filtered from ${data.stockMovements.length})...`);
        const stockMovementsData = validStockMovements.map(item => ({
          user_id: userId,
          id: item.id,
          product_id: item.productId,
          product_name: item.productName,
          type: item.type,
          quantity: item.quantity,
          reason: item.reason,
          reference: item.reference || null,
          supplier_id: item.supplierId || null,
          supplier_name: item.supplierName || null,
          unit_cost: item.unitCost || null,
          total_cost: item.totalCost || null,
          date: item.date,
          created_by: item.createdBy
        }));
        
        const { error: stockMovementsError } = await supabase.from('stock_movements').upsert(stockMovementsData, {
          onConflict: 'id'
        });
        if (stockMovementsError) {
          safeConsole.error('Stock movements upsert error:', stockMovementsError);
          throw stockMovementsError;
        }
        safeConsole.log('✅ Stock movements upserted successfully');
      } else {
        safeConsole.log('⚠️ No valid stock movements to upsert (all filtered out due to missing products)');
      }
      
      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 5: Notifications fifth (can depend on products) - Filter out invalid references
    if (data.notifications && data.notifications.length > 0) {
      safeConsole.log(`Preparing ${data.notifications.length} notifications for upsert...`);
      
      // Query database to get actual existing products for this user (for notifications that reference products)
      const { data: existingProducts, error: productsQueryError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);
      
      if (productsQueryError) {
        safeConsole.error('Error querying existing products for notifications:', productsQueryError);
        throw productsQueryError;
      }
      
      const existingProductIds = new Set(existingProducts?.map(p => p.id) || []);
      safeConsole.log(`Found ${existingProductIds.size} existing products for notifications filtering`);
      
      // Filter out notifications that reference non-existent products (if they have productId)
      const validNotifications = data.notifications.filter(notification => {
        if (!notification.productId) return true; // Notifications without productId are always valid
        const hasValidProduct = existingProductIds.has(notification.productId);
        if (!hasValidProduct) {
          safeConsole.warn(`Skipping notification ${notification.id} - product ${notification.productId} not found in database`);
        }
        return hasValidProduct;
      });
      
      if (validNotifications.length > 0) {
        safeConsole.log(`Upserting ${validNotifications.length} valid notifications (filtered from ${data.notifications.length})...`);
        const notificationsData = validNotifications.map(item => ({
          user_id: userId,
          id: item.id,
          type: item.type,
          title: item.title,
          message: item.message,
          product_id: item.productId || null,
          is_read: item.isRead,
          priority: item.priority,
          created_at: item.createdAt
        }));
        
        const { error: notificationsError } = await supabase.from('notifications').upsert(notificationsData, {
          onConflict: 'id'
        });
        if (notificationsError) {
          safeConsole.error('Notifications upsert error:', notificationsError);
          throw notificationsError;
        }
        safeConsole.log('✅ Notifications upserted successfully');
      } else {
        safeConsole.log('⚠️ No valid notifications to upsert (all filtered out due to missing products)');
      }
      
      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 6: Settings last (no dependencies)
    if (data.settings) {
      safeConsole.log('Upserting settings...');
      const { error: settingsError } = await supabase.from('settings').upsert({
        ...data.settings,
        user_id: userId
      });
      
      if (settingsError) {
        safeConsole.error('Settings upsert error:', settingsError);
        throw settingsError;
      }
      safeConsole.log('✅ Settings upserted successfully');
    }
    
    safeConsole.log('🎉 All data synced successfully with preserved foreign key relationships using filtered upserts!');
    
  } catch (error) {
    safeConsole.error('Error in ordered upsert sync:', error);
    throw error;
  }
};

export const useUserData = () => {
  const { user, loading: authLoading } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<SettingsType>(getDefaultSettings(null));
  const [dataLoading, setDataLoading] = useState(true);

  // Load user-specific data when user changes
  useEffect(() => {
    // Auth state changed, loading data...
    
    if (authLoading) {
      // Auth still loading, waiting...
      return;
    }

    if (!user) {
      // User signed out - clear all data
      // No user found, clearing data
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings(null));
      setDataLoading(false);
      return;
    }

    // SECURITY: Check if user is admin - admins should not load regular user data
    if (isAdminUser(user)) {
      // Admin user detected, not loading regular user data
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings(null));
      setDataLoading(false);
      return;
    }

    // User signed in - load their specific data
    // Loading user data...
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      safeConsole.warn('Data loading timed out, setting dataLoading to false');
      setDataLoading(false);
    }, 10000); // 10 second timeout

    loadUserData(user.id).finally(() => {
      clearTimeout(loadingTimeout);
    });

    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [user, authLoading]);

  const loadUserData = async (userId: string) => {
    // Starting data load...
    
    try {
      setDataLoading(true);
      
      // Clear any old global storage keys first (fast operation)
      clearGlobalStorageKeys();

      // Step 1: Load from localStorage immediately (fast)
      safeConsole.log('Loading from localStorage...');
      const localProducts = localStorage.getItem(getUserStorageKey(userId, 'products'));
      const localSales = localStorage.getItem(getUserStorageKey(userId, 'sales'));
      const localSuppliers = localStorage.getItem(getUserStorageKey(userId, 'suppliers'));
      const localStockMovements = localStorage.getItem(getUserStorageKey(userId, 'stock_movements'));
      const localNotifications = localStorage.getItem(getUserStorageKey(userId, 'notifications'));
      const localSettings = localStorage.getItem(getUserStorageKey(userId, 'settings'));

      // Step 2: Parse localStorage data or use defaults
      let products: Product[] = [];
      let sales: Sale[] = [];
      let suppliers: Supplier[] = [];
      let stockMovements: StockMovement[] = [];
      let notifications: Notification[] = [];
      let settings: SettingsType = getDefaultSettings({ id: userId });

      try {
        products = localProducts ? JSON.parse(localProducts) : [];
        sales = localSales ? JSON.parse(localSales) : [];
        suppliers = localSuppliers ? JSON.parse(localSuppliers) : [];
        stockMovements = localStockMovements ? JSON.parse(localStockMovements) : [];
        notifications = localNotifications ? JSON.parse(localNotifications) : [];
        settings = localSettings ? JSON.parse(localSettings) : getDefaultSettings({ id: userId });
        
        // Migrate old short IDs to proper UUIDs with relationship preservation
        safeConsole.log('Checking for ID migration...');
        const originalProductCount = products.length;
        
        if (originalProductCount > 0) {
          // Migrate all data together to preserve foreign key relationships
          const migratedData = migrateIdsToUUIDs({
            products,
            sales,
            suppliers,
            stockMovements,
            notifications
          });
          
          // Update the variables with migrated data
          products = migratedData.products;
          sales = migratedData.sales;
          suppliers = migratedData.suppliers;
          stockMovements = migratedData.stockMovements;
          notifications = migratedData.notifications;
          
          safeConsole.log('ID migration completed - saving updated data to localStorage');
          // Save the migrated data back to localStorage
          localStorage.setItem(getUserStorageKey(userId, 'products'), JSON.stringify(products));
          localStorage.setItem(getUserStorageKey(userId, 'sales'), JSON.stringify(sales));
          localStorage.setItem(getUserStorageKey(userId, 'suppliers'), JSON.stringify(suppliers));
          localStorage.setItem(getUserStorageKey(userId, 'stock_movements'), JSON.stringify(stockMovements));
          localStorage.setItem(getUserStorageKey(userId, 'notifications'), JSON.stringify(notifications));
        }
      } catch (parseError) {
        safeConsole.error('Error parsing localStorage data:', parseError);
        // Continue with defaults if parsing fails
      }

      // Step 3: Set the data immediately from localStorage (or defaults)
      setProducts(products);
      setSales(sales);
      setSuppliers(suppliers);
      setStockMovements(stockMovements);
      setNotifications(notifications);
      setSettings(settings);

      safeConsole.log('Initial data set from localStorage:', {
        products: products.length,
        sales: sales.length,
        suppliers: suppliers.length,
        stockMovements: stockMovements.length,
        notifications: notifications.length,
        settings: settings.businessName
      });

      // Step 4: Always load from Supabase to get latest data (with timeout)
      safeConsole.log('Loading latest data from Supabase...');
      Promise.race([
        loadFromSupabase(userId),
        new Promise<null>(resolve => setTimeout(() => {
          safeConsole.log('Supabase load timed out, using local data...');
          resolve(null);
        }, 5000))
      ]).then((supabaseData: SupabaseData | null) => {
        if (supabaseData) {
          safeConsole.log('Syncing with latest Supabase data (server is source of truth)...');
          
          // Always prefer Supabase data as the source of truth for cross-device sync
          // Only fall back to local data if Supabase is completely empty AND we have local data
          
          const latestProducts = supabaseData.products && supabaseData.products.length > 0 
            ? supabaseData.products 
            : (products.length > 0 ? products : []);
            
          const latestSales = supabaseData.sales && supabaseData.sales.length > 0
            ? supabaseData.sales
            : (sales.length > 0 ? sales : []);
            
          const latestSuppliers = supabaseData.suppliers && supabaseData.suppliers.length > 0
            ? supabaseData.suppliers
            : (suppliers.length > 0 ? suppliers : []);
            
          const latestStockMovements = supabaseData.stockMovements && supabaseData.stockMovements.length > 0
            ? supabaseData.stockMovements
            : (stockMovements.length > 0 ? stockMovements : []);
            
          const latestNotifications = supabaseData.notifications && supabaseData.notifications.length > 0
            ? supabaseData.notifications
            : (notifications.length > 0 ? notifications : []);
            
          const latestSettings = supabaseData.settings || settings;

          // Update state with latest data
          setProducts(latestProducts);
          setSales(latestSales);
          setSuppliers(latestSuppliers);
          setStockMovements(latestStockMovements);
          setNotifications(latestNotifications);
          setSettings(latestSettings);

          // Update localStorage with latest data
          localStorage.setItem(getUserStorageKey(userId, 'products'), JSON.stringify(latestProducts));
          localStorage.setItem(getUserStorageKey(userId, 'sales'), JSON.stringify(latestSales));
          localStorage.setItem(getUserStorageKey(userId, 'suppliers'), JSON.stringify(latestSuppliers));
          localStorage.setItem(getUserStorageKey(userId, 'stock_movements'), JSON.stringify(latestStockMovements));
          localStorage.setItem(getUserStorageKey(userId, 'notifications'), JSON.stringify(latestNotifications));
          localStorage.setItem(getUserStorageKey(userId, 'settings'), JSON.stringify(latestSettings));

          safeConsole.log('Cross-device sync completed:', {
            products: `${latestProducts.length} items (${supabaseData.products && supabaseData.products.length > 0 ? 'from server' : 'from local backup'})`,
            sales: `${latestSales.length} items (${supabaseData.sales && supabaseData.sales.length > 0 ? 'from server' : 'from local backup'})`,
            suppliers: `${latestSuppliers.length} items (${supabaseData.suppliers && supabaseData.suppliers.length > 0 ? 'from server' : 'from local backup'})`,
            stockMovements: `${latestStockMovements.length} items (${supabaseData.stockMovements && supabaseData.stockMovements.length > 0 ? 'from server' : 'from local backup'})`,
            notifications: `${latestNotifications.length} items (${supabaseData.notifications && supabaseData.notifications.length > 0 ? 'from server' : 'from local backup'})`,
            settings: `Business: ${latestSettings.businessName} (${supabaseData.settings ? 'from server' : 'from local backup'})`
          });
          
          // If we have local data but server doesn't, upload local data to server
          const hasLocalData = (
            (products.length > 0 && (!supabaseData.products || supabaseData.products.length === 0)) ||
            (sales.length > 0 && (!supabaseData.sales || supabaseData.sales.length === 0)) ||
            (suppliers.length > 0 && (!supabaseData.suppliers || supabaseData.suppliers.length === 0)) ||
            (stockMovements.length > 0 && (!supabaseData.stockMovements || supabaseData.stockMovements.length === 0)) ||
            (notifications.length > 0 && (!supabaseData.notifications || supabaseData.notifications.length === 0))
          );
          
          if (hasLocalData) {
            safeConsole.log('Uploading local data to server with proper foreign key dependency order...');
            syncAllUserDataWithDependencies(userId, {
              products,
              sales,
              suppliers,
              stockMovements,
              notifications,
              settings
            }).then(() => {
              safeConsole.log('Local data successfully uploaded to server for cross-device sync');
            }).catch(err => {
              safeConsole.warn('Upload failed:', err);
            });
          }
        } else {
          safeConsole.log('Server sync failed, using local data only');
        }
      }).catch(err => {
        safeConsole.warn('Supabase sync failed, using local data:', err);
      }).finally(() => {
        // Migration in background (non-blocking)
        migrateLocalStorageToSupabase(userId).catch(err => {
          safeConsole.warn('Migration failed (non-blocking):', err);
        });
      });

      safeConsole.log('User data loaded successfully for user:', userId);

    } catch (error) {
      safeConsole.error('Error loading user data:', error);
      // On error, ensure we have at least default data
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings({ id: userId }));
    } finally {
      safeConsole.log('Setting dataLoading to false');
      setDataLoading(false);
    }
  };

  const saveUserData = async (userId: string, dataType: UserDataType, data: SyncData) => {
    try {
      // Save to localStorage first (primary storage)
      localStorage.setItem(getUserStorageKey(userId, dataType), JSON.stringify(data));
      
      // Sync to Supabase in the background (for cross-device access)
      await syncToSupabase(userId, dataType, data);
    } catch (error) {
      safeConsole.error(`Error saving ${dataType}:`, error);
    }
  };

  // Update functions that save to both localStorage and Supabase
  const updateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    if (user) {
      saveUserData(user.id, 'products', newProducts).catch(err => {
        safeConsole.warn('Failed to save products (non-blocking):', err);
      });
    }
  };

  const updateSales = (newSales: Sale[]) => {
    setSales(newSales);
    if (user) {
      saveUserData(user.id, 'sales', newSales).catch(err => {
        safeConsole.warn('Failed to save sales (non-blocking):', err);
      });
    }
  };

  const updateSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    if (user) {
      saveUserData(user.id, 'suppliers', newSuppliers).catch(err => {
        safeConsole.warn('Failed to save suppliers (non-blocking):', err);
      });
    }
  };

  const updateStockMovements = (newStockMovements: StockMovement[]) => {
    setStockMovements(newStockMovements);
    if (user) {
      saveUserData(user.id, 'stock_movements', newStockMovements).catch(err => {
        safeConsole.warn('Failed to save stock movements (non-blocking):', err);
      });
    }
  };

  const updateNotifications = (newNotifications: Notification[]) => {
    setNotifications(newNotifications);
    if (user) {
      saveUserData(user.id, 'notifications', newNotifications).catch(err => {
        safeConsole.warn('Failed to save notifications (non-blocking):', err);
      });
    }
  };

  const updateSettings = (newSettings: SettingsType) => {
    setSettings(newSettings);
    if (user) {
      saveUserData(user.id, 'settings', newSettings).catch(err => {
        safeConsole.warn('Failed to save settings (non-blocking):', err);
      });
    }
  };

  // Clear all user data (for account deletion or reset)
  const clearUserData = async () => {
    if (!user) return;

    try {
      // Clear from localStorage
      const dataTypes = ['products', 'sales', 'suppliers', 'stock_movements', 'notifications', 'settings'];
      dataTypes.forEach(dataType => {
        localStorage.removeItem(getUserStorageKey(user.id, dataType));
      });

      // Clear from Supabase
      await Promise.all([
        supabase.from('products').delete().eq('user_id', user.id),
        supabase.from('sales').delete().eq('user_id', user.id),
        supabase.from('suppliers').delete().eq('user_id', user.id),
        supabase.from('stock_movements').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('user_id', user.id),
        supabase.from('settings').delete().eq('user_id', user.id),
      ]);

      // Reset to fresh state
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings({ id: user.id }));
      
      safeConsole.log('User data cleared from both localStorage and Supabase');
    } catch (error) {
      safeConsole.error('Error clearing user data:', error);
    }
  };

  // Force sync all data to Supabase (useful for manual sync)
  const syncAllDataToSupabase = async () => {
    if (!user) return;

    try {
      safeConsole.log('Manually syncing all data to Supabase with proper foreign key dependency order...');
      
      await syncAllUserDataWithDependencies(user.id, {
        products,
        sales,
        suppliers,
        stockMovements,
        notifications,
        settings
      });
      
      safeConsole.log('Manual sync completed successfully');
    } catch (error) {
      safeConsole.error('Error during manual sync:', error);
    }
  };

  // Debug function to force stop loading
  const forceStopLoading = () => {
    safeConsole.log('Forcing dataLoading to false');
    setDataLoading(false);
  };

  return {
    // Data
    products,
    sales,
    suppliers,
    stockMovements,
    notifications,
    settings,
    
    // Update functions
    updateProducts,
    updateSales,
    updateSuppliers,
    updateStockMovements,
    updateNotifications,
    updateSettings,
    
    // Utility functions
    clearUserData,
    syncAllDataToSupabase,
    forceStopLoading,
    
    // Loading states
    dataLoading: dataLoading || authLoading,
  };
};
