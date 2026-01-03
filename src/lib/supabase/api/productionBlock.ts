import { getSupabase, handleSupabaseError } from '../utils';
import type { ProductionBlock, ProductionBlockWithRelations, ProductionBlockColorSegment, ProductionBlockProductColor, ProductionBlockPackingMaterial, ProductionBlockPartyCode } from '../types';
export const productionBlockAPI = {
  // Get all blocks for a specific month/year
  async getByMonth(year: number, month: number): Promise<ProductionBlockWithRelations[]> {
    try {
      const supabase = getSupabase();
      // Fetch blocks
      const { data: blocks, error: blocksError } = await supabase
        .from('production_blocks')
        .select('*')
        .eq('planning_year', year)
        .eq('planning_month', month)
        .order('start_day', { ascending: true })
        .order('line_id', { ascending: true });
      
      if (blocksError) {
        handleSupabaseError(blocksError, 'fetching production blocks');
        throw blocksError;
      }

      if (!blocks || blocks.length === 0) {
        return [];
      }

      const blockIds = blocks.map(b => b.id);

      // Fetch all related data in parallel
      const [
        { data: colorSegments },
        { data: productColors },
        { data: packingMaterials },
        { data: partyCodes }
      ] = await Promise.all([
        supabase.from('production_block_color_segments').select('*').in('block_id', blockIds),
        supabase.from('production_block_product_colors').select('*').in('block_id', blockIds),
        supabase.from('production_block_packing_materials').select('*').in('block_id', blockIds),
        supabase.from('production_block_party_codes').select('*').in('block_id', blockIds)
      ]);

      // Combine data
      return blocks.map(block => ({
        ...block,
        color_segments: colorSegments?.filter(cs => cs.block_id === block.id) || [],
        product_colors: productColors?.filter(pc => pc.block_id === block.id) || [],
        packing_materials: packingMaterials?.filter(pm => pm.block_id === block.id) || [],
        party_codes: partyCodes?.filter(pc => pc.block_id === block.id) || []
      })) as ProductionBlockWithRelations[];
    } catch (error) {
      console.error('❌ Failed to fetch production blocks:', error);
      throw error;
    }
  },

  // Get single block by ID
  async getById(blockId: string): Promise<ProductionBlockWithRelations | null> {
    try {
      const supabase = getSupabase();
      const { data: block, error } = await supabase
        .from('production_blocks')
        .select('*')
        .eq('id', blockId)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching production block');
        return null;
      }

      if (!block) return null;

      // Fetch related data
      const [
        { data: colorSegments },
        { data: productColors },
        { data: packingMaterials },
        { data: partyCodes }
      ] = await Promise.all([
        supabase.from('production_block_color_segments').select('*').eq('block_id', blockId),
        supabase.from('production_block_product_colors').select('*').eq('block_id', blockId),
        supabase.from('production_block_packing_materials').select('*').eq('block_id', blockId),
        supabase.from('production_block_party_codes').select('*').eq('block_id', blockId)
      ]);

      return {
        ...block,
        color_segments: colorSegments || [],
        product_colors: productColors || [],
        packing_materials: packingMaterials || [],
        party_codes: partyCodes || []
      } as ProductionBlockWithRelations;
    } catch (error) {
      console.error('❌ Failed to fetch production block:', error);
      return null;
    }
  },

  // Create or update block with all related data
  async save(block: ProductionBlockWithRelations): Promise<ProductionBlockWithRelations | null> {
    try {
      const supabase = getSupabase();
      // Prepare main block data (exclude relations)
      const { color_segments, product_colors, packing_materials, party_codes, ...blockData } = block;

      console.log('💾 productionBlockAPI.save - Block data to save:', blockData);
      console.log('💾 productionBlockAPI.save - Related data:', {
        color_segments: color_segments?.length || 0,
        product_colors: product_colors?.length || 0,
        packing_materials: packing_materials?.length || 0,
        party_codes: party_codes?.length || 0
      });

      // Upsert main block
      const { data: savedBlock, error: blockError } = await supabase
        .from('production_blocks')
        .upsert(blockData, { onConflict: 'id' })
        .select()
        .single();

      if (blockError) {
        console.error('❌ productionBlockAPI.save - Block upsert error:', blockError);
        handleSupabaseError(blockError, 'saving production block');
        throw blockError;
      }

      if (!savedBlock) {
        console.error('❌ productionBlockAPI.save - No block returned from upsert');
        return null;
      }

      console.log('✅ productionBlockAPI.save - Block saved:', savedBlock.id);

      // Delete existing related data
      const deleteResults = await Promise.all([
        supabase.from('production_block_color_segments').delete().eq('block_id', savedBlock.id),
        supabase.from('production_block_product_colors').delete().eq('block_id', savedBlock.id),
        supabase.from('production_block_packing_materials').delete().eq('block_id', savedBlock.id),
        supabase.from('production_block_party_codes').delete().eq('block_id', savedBlock.id)
      ]);
      
      // Check for delete errors
      for (const result of deleteResults) {
        if (result.error) {
          console.warn('⚠️ productionBlockAPI.save - Delete error (non-fatal):', result.error);
        }
      }

      // Insert new related data
      if (color_segments && color_segments.length > 0) {
        await supabase.from('production_block_color_segments').insert(
          color_segments.map(cs => ({ ...cs, block_id: savedBlock.id }))
        );
      }

      if (product_colors && product_colors.length > 0) {
        await supabase.from('production_block_product_colors').insert(
          product_colors.map(pc => ({ ...pc, block_id: savedBlock.id }))
        );
      }

      if (packing_materials && packing_materials.length > 0) {
        await supabase.from('production_block_packing_materials').insert(
          packing_materials.map(pm => ({ ...pm, block_id: savedBlock.id }))
        );
      }

      if (party_codes && party_codes.length > 0) {
        // Remove duplicates before inserting to avoid unique constraint violations
        const uniquePartyCodes = Array.from(new Set(
          party_codes.map(pc => {
            const code = typeof pc === 'string' ? pc : (pc.party_code || pc);
            return code ? String(code).trim() : null;
          }).filter(Boolean)
        ));
        
        if (uniquePartyCodes.length > 0) {
          // Insert party codes one by one to handle conflicts gracefully
          // This avoids 409 errors if there are any race conditions or duplicates
          const insertPromises = uniquePartyCodes.map(async (partyCode) => {
            const { error } = await supabase
              .from('production_block_party_codes')
              .insert({ 
                party_code: partyCode, 
                block_id: savedBlock.id 
              });
            
            // Ignore duplicate key errors (409) - they're harmless
            if (error && error.code !== '23505' && !error.message?.includes('duplicate') && !error.message?.includes('unique')) {
              console.warn(`⚠️ productionBlockAPI.save - Failed to insert party code "${partyCode}":`, error);
            }
            return error;
          });
          
          const results = await Promise.allSettled(insertPromises);
          const errors = results
            .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value))
            .map(r => r.status === 'rejected' ? r.reason : r.value)
            .filter(e => e && e.code !== '23505' && !e.message?.includes('duplicate') && !e.message?.includes('unique'));
          
          if (errors.length > 0) {
            console.warn('⚠️ productionBlockAPI.save - Some party codes failed to insert (non-fatal):', errors);
          }
        }
      }

      // Return complete block
      return await this.getById(savedBlock.id);
    } catch (error) {
      console.error('❌ Failed to save production block:', error);
      throw error;
    }
  },

  // Bulk save multiple blocks
  async bulkSave(blocks: ProductionBlockWithRelations[]): Promise<ProductionBlockWithRelations[]> {
    try {
      const savedBlocks: ProductionBlockWithRelations[] = [];
      
      for (const block of blocks) {
        const saved = await this.save(block);
        if (saved) savedBlocks.push(saved);
      }

      console.log('✅ Successfully saved', savedBlocks.length, 'production blocks');
      return savedBlocks;
    } catch (error) {
      console.error('❌ Failed to bulk save production blocks:', error);
      throw error;
    }
  },

  // Delete block and all related data
  async delete(blockId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      // Cascade delete will handle related tables, but we can be explicit
      const { error } = await supabase
        .from('production_blocks')
        .delete()
        .eq('id', blockId);
      
      if (error) {
        handleSupabaseError(error, 'deleting production block');
        throw error;
      }

      console.log('✅ Successfully deleted production block:', blockId);
    } catch (error) {
      console.error('❌ Failed to delete production block:', error);
      throw error;
    }
  },

  // Delete all blocks for a specific month/year
  async deleteByMonth(year: number, month: number): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('production_blocks')
        .delete()
        .eq('planning_year', year)
        .eq('planning_month', month);
      
      if (error) {
        handleSupabaseError(error, 'deleting production blocks by month');
        throw error;
      }

      console.log(`✅ Successfully deleted all production blocks for ${month}/${year}`);
    } catch (error) {
      console.error('❌ Failed to delete production blocks by month:', error);
      throw error;
    }
  },

  // Delete multiple blocks
  async bulkDelete(blockIds: string[]): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('production_blocks')
        .delete()
        .in('id', blockIds);
      
      if (error) {
        handleSupabaseError(error, 'bulk deleting production blocks');
        throw error;
      }

      console.log('✅ Successfully deleted', blockIds.length, 'production blocks');
    } catch (error) {
      console.error('❌ Failed to bulk delete production blocks:', error);
      throw error;
    }
  }
};