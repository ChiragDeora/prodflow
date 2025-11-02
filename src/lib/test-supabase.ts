// Test Supabase client configuration and machine updates
import { supabase, machineAPI } from './supabase';

export async function testMachineUpdate() {
  console.log('🧪 Testing Supabase client configuration...');
  
  try {
    // Test 1: Check if we can fetch machines
    console.log('📋 Test 1: Fetching machines...');
    const machines = await machineAPI.getAll();
    console.log(`✅ Successfully fetched ${machines.length} machines`);
    
    // Test 2: Check if we can get a specific machine
    console.log('🔍 Test 2: Getting specific machine...');
    const testMachine = await machineAPI.getById('JSW-1');
    if (testMachine) {
      console.log(`✅ Found machine: ${testMachine.machine_id} (${testMachine.make} ${testMachine.model})`);
    } else {
      console.log('❌ Machine JSW-1 not found');
      return;
    }
    
    // Test 3: Try to update a machine
    console.log('✏️ Test 3: Updating machine...');
    const updateResult = await machineAPI.update('JSW-1', { 
      line: 'TEST-LINE-001',
      updated_at: new Date().toISOString()
    });
    
    if (updateResult) {
      console.log(`✅ Successfully updated machine: ${updateResult.machine_id} with line: ${updateResult.line}`);
    } else {
      console.log('❌ Failed to update machine');
    }
    
    // Test 4: Revert the test update
    console.log('🔄 Test 4: Reverting test update...');
    await machineAPI.update('JSW-1', { 
      line: undefined,
      updated_at: new Date().toISOString()
    });
    console.log('✅ Test update reverted');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testMachineUpdate = testMachineUpdate;
}
