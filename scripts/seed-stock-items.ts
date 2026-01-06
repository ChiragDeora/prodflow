// ============================================================================
// SEED SCRIPT: Populate stock_items table from existing master tables
// ============================================================================
// Run this script to populate the stock_items table with items from:
// - raw_materials table
// - packing_materials table
// - sfg_bom table
// - fg_bom table
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface StockItemInsert {
  item_code: string;
  item_name: string;
  item_type: 'RM' | 'PM' | 'SFG' | 'FG';
  category?: string;
  sub_category?: string;
  unit_of_measure: 'KG' | 'NOS' | 'METERS';
  is_active: boolean;
}

async function seedStockItems() {
  console.log('🚀 Starting stock_items seed script...\n');
  
  const itemsToInsert: StockItemInsert[] = [];
  
  // ============================================================================
  // 1. SEED FROM raw_materials TABLE
  // ============================================================================
  console.log('📦 Processing raw_materials...');
  
  try {
    const { data: rawMaterials, error: rmError } = await supabase
      .from('raw_materials')
      .select('*');
    
    if (rmError) {
      console.error('❌ Error fetching raw_materials:', rmError.message);
    } else if (rawMaterials && rawMaterials.length > 0) {
      for (const rm of rawMaterials) {
        // Generate item code: PP-{TYPE}-{GRADE}
        const type = rm.type || 'HP';
        const grade = rm.grade || rm.material_name || 'UNKNOWN';
        const itemCode = `PP-${type}-${grade}`;
        
        itemsToInsert.push({
          item_code: itemCode,
          item_name: `${rm.category || 'PP'} ${type} ${grade}`,
          item_type: 'RM',
          category: 'PP',
          sub_category: type,
          unit_of_measure: 'KG',
          is_active: true,
        });
      }
      console.log(`   ✅ Found ${rawMaterials.length} raw materials`);
    } else {
      console.log('   ⚠️ No raw materials found');
    }
  } catch (err) {
    console.error('   ❌ Error processing raw_materials:', err);
  }
  
  // Add special RM items
  const specialRmItems: StockItemInsert[] = [
    {
      item_code: 'REGRIND',
      item_name: 'Regrind Material',
      item_type: 'RM',
      category: 'REGRIND',
      unit_of_measure: 'KG',
      is_active: true,
    },
    {
      item_code: 'MB-BLACK',
      item_name: 'Masterbatch Black',
      item_type: 'RM',
      category: 'MB',
      unit_of_measure: 'KG',
      is_active: true,
    },
    {
      item_code: 'MB-WHITE',
      item_name: 'Masterbatch White',
      item_type: 'RM',
      category: 'MB',
      unit_of_measure: 'KG',
      is_active: true,
    },
    {
      item_code: 'LABEL-IML-001',
      item_name: 'IML Label Default',
      item_type: 'RM',
      category: 'LABEL',
      unit_of_measure: 'NOS',
      is_active: true,
    },
  ];
  
  itemsToInsert.push(...specialRmItems);
  console.log(`   ✅ Added ${specialRmItems.length} special RM items`);
  
  // ============================================================================
  // 2. SEED FROM packing_materials TABLE
  // ============================================================================
  console.log('\n📦 Processing packing_materials...');
  
  try {
    const { data: packingMaterials, error: pmError } = await supabase
      .from('packing_materials')
      .select('*');
    
    if (pmError) {
      console.error('❌ Error fetching packing_materials:', pmError.message);
    } else if (packingMaterials && packingMaterials.length > 0) {
      for (const pm of packingMaterials) {
        const itemCode = pm.item_code || pm.material_name;
        const category = pm.category || 'PM';
        
        // Determine unit based on category
        let unit: 'KG' | 'NOS' | 'METERS' = 'NOS';
        if (category.toUpperCase().includes('BOPP')) {
          unit = 'METERS';
        }
        
        itemsToInsert.push({
          item_code: itemCode,
          item_name: pm.material_name || itemCode,
          item_type: 'PM',
          category: category,
          unit_of_measure: unit,
          is_active: true,
        });
      }
      console.log(`   ✅ Found ${packingMaterials.length} packing materials`);
    } else {
      console.log('   ⚠️ No packing materials found');
    }
  } catch (err) {
    console.error('   ❌ Error processing packing_materials:', err);
  }
  
  // ============================================================================
  // 3. SEED FROM sfg_bom TABLE
  // ============================================================================
  console.log('\n📦 Processing sfg_bom...');
  
  try {
    const { data: sfgBoms, error: sfgError } = await supabase
      .from('sfg_bom')
      .select('*');
    
    if (sfgError) {
      console.error('❌ Error fetching sfg_bom:', sfgError.message);
    } else if (sfgBoms && sfgBoms.length > 0) {
      for (const sfg of sfgBoms) {
        itemsToInsert.push({
          item_code: sfg.sfg_code,
          item_name: sfg.item_name, // Mold name
          item_type: 'SFG',
          unit_of_measure: 'NOS',
          is_active: true,
        });
      }
      console.log(`   ✅ Found ${sfgBoms.length} SFG items`);
    } else {
      console.log('   ⚠️ No SFG BOM entries found');
    }
  } catch (err) {
    console.error('   ❌ Error processing sfg_bom:', err);
  }
  
  // ============================================================================
  // 4. SEED FROM fg_bom TABLE
  // ============================================================================
  console.log('\n📦 Processing fg_bom...');
  
  try {
    const { data: fgBoms, error: fgError } = await supabase
      .from('fg_bom')
      .select('*');
    
    if (fgError) {
      console.error('❌ Error fetching fg_bom:', fgError.message);
    } else if (fgBoms && fgBoms.length > 0) {
      for (const fg of fgBoms) {
        itemsToInsert.push({
          item_code: fg.item_code,
          item_name: fg.item_name || fg.item_code,
          item_type: 'FG',
          unit_of_measure: 'NOS',
          is_active: true,
        });
      }
      console.log(`   ✅ Found ${fgBoms.length} FG items`);
    } else {
      console.log('   ⚠️ No FG BOM entries found');
    }
  } catch (err) {
    console.error('   ❌ Error processing fg_bom:', err);
  }
  
  // ============================================================================
  // 5. INSERT INTO stock_items (with upsert to avoid duplicates)
  // ============================================================================
  console.log('\n📝 Inserting items into stock_items...');
  
  if (itemsToInsert.length === 0) {
    console.log('⚠️ No items to insert');
    return;
  }
  
  // Remove duplicates based on item_code
  const uniqueItems = Array.from(
    new Map(itemsToInsert.map(item => [item.item_code, item])).values()
  );
  
  console.log(`   📊 Total unique items to insert: ${uniqueItems.length}`);
  
  // Insert in batches to avoid timeout
  const batchSize = 100;
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < uniqueItems.length; i += batchSize) {
    const batch = uniqueItems.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('stock_items')
      .upsert(batch, {
        onConflict: 'item_code',
        ignoreDuplicates: true,
      })
      .select();
    
    if (error) {
      console.error(`   ❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
      skippedCount += batch.length;
    } else {
      insertedCount += data?.length || 0;
      console.log(`   ✅ Batch ${i / batchSize + 1}: Inserted ${data?.length || 0} items`);
    }
  }
  
  // ============================================================================
  // 6. SUMMARY
  // ============================================================================
  console.log('\n============================================');
  console.log('📊 SEED SCRIPT SUMMARY');
  console.log('============================================');
  console.log(`   Total items processed: ${uniqueItems.length}`);
  console.log(`   Items inserted/updated: ${insertedCount}`);
  console.log(`   Items skipped (errors): ${skippedCount}`);
  console.log('============================================\n');
  
  // Verify final count
  const { count } = await supabase
    .from('stock_items')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📦 Total items in stock_items table: ${count}`);
}

// Run the seed script
seedStockItems()
  .then(() => {
    console.log('\n✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });


