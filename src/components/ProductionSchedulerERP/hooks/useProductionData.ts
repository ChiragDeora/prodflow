'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  machineAPI, 
  moldAPI, 
  scheduleAPI, 
  rawMaterialAPI, 
  packingMaterialAPI,
  lineAPI,
  unitAPI,
  unitManagementSettingsAPI
} from '../../../lib/supabase';
import type { 
  Machine, 
  Mold, 
  ScheduleJob, 
  RawMaterial, 
  PackingMaterial, 
  Line, 
  Unit,
  FilteredData,
  SortDirection
} from '../types';

interface UseProductionDataReturn {
  // Data
  machinesMaster: Machine[];
  moldsMaster: Mold[];
  rawMaterialsMaster: RawMaterial[];
  packingMaterialsMaster: PackingMaterial[];
  linesMaster: Line[];
  scheduleData: ScheduleJob[];
  units: Unit[];
  unitManagementEnabled: boolean;
  defaultUnit: string;
  
  // State
  loading: boolean;
  selectedUnit: string;
  
  // Actions
  loadAllData: () => Promise<void>;
  handleDataImported: () => void;
  handleUnitFilterChange: (unit: string) => void;
  getFilteredData: () => FilteredData;
  getAvailableUnits: () => { id: string; name: string }[];
  
  // Setters for external updates
  setMachinesMaster: React.Dispatch<React.SetStateAction<Machine[]>>;
  setMoldsMaster: React.Dispatch<React.SetStateAction<Mold[]>>;
  setRawMaterialsMaster: React.Dispatch<React.SetStateAction<RawMaterial[]>>;
  setPackingMaterialsMaster: React.Dispatch<React.SetStateAction<PackingMaterial[]>>;
  setLinesMaster: React.Dispatch<React.SetStateAction<Line[]>>;
}

export function useProductionData(): UseProductionDataReturn {
  const [machinesMaster, setMachinesMaster] = useState<Machine[]>([]);
  const [moldsMaster, setMoldsMaster] = useState<Mold[]>([]);
  const [rawMaterialsMaster, setRawMaterialsMaster] = useState<RawMaterial[]>([]);
  const [packingMaterialsMaster, setPackingMaterialsMaster] = useState<PackingMaterial[]>([]);
  const [linesMaster, setLinesMaster] = useState<Line[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleJob[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitManagementEnabled, setUnitManagementEnabled] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState('Unit 1');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  // Load data from Supabase on component mount
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let isMounted = true;
    
    const loadDataWithTimeout = async () => {
      if (!isMounted) return;
      
      try {
        console.log(`Starting data loading (attempt ${retryCount + 1}/${maxRetries})...`);
        await loadAllData();
        
        if (isMounted) {
          console.log('Data loading completed successfully');
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error(`Error loading data (attempt ${retryCount + 1}):`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('JWT') || errorMessage.includes('auth') || errorMessage.includes('timeout')) {
          console.log('Auth-related or timeout error, stopping retries');
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
        retryCount++;
        
        if (retryCount < maxRetries && isMounted) {
          console.log(`Retrying data loading in ${retryCount * 2000}ms...`);
          setTimeout(loadDataWithTimeout, retryCount * 2000);
        } else {
          console.log('Max retries reached, stopping data loading');
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    };
    
    const timer = setTimeout(() => {
      if (isMounted) {
        loadDataWithTimeout();
      }
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('Loading all data...');
      
      let machines: Machine[] = [];
      let molds: Mold[] = [];
      let schedules: ScheduleJob[] = [];
      let rawMaterials: RawMaterial[] = [];
      let packingMaterials: PackingMaterial[] = [];
      let lines: Line[] = [];
      let unitsData: Unit[] = [];
      
      // Load each data type individually to catch specific errors
      try {
        machines = await machineAPI.getAll();
      } catch (error) {
        console.error('Machines API call failed:', error);
      }
      
      try {
        molds = await moldAPI.getAll();
      } catch (error) {
        console.error('Molds API call failed:', error);
      }
      
      try {
        schedules = await scheduleAPI.getAll();
      } catch (error) {
        console.error('Schedules API call failed:', error);
      }
      
      try {
        rawMaterials = await rawMaterialAPI.getAll();
      } catch (error) {
        console.error('Raw Materials API call failed:', error);
      }
      
      try {
        packingMaterials = await packingMaterialAPI.getAll();
      } catch (error) {
        console.error('Packing Materials API call failed:', error);
      }
      
      try {
        lines = await lineAPI.getAll();
      } catch (error) {
        console.error('Lines API call failed:', error);
      }
      
      try {
        unitsData = await unitAPI.getAll();
      } catch (error) {
        console.error('Units API call failed:', error);
      }
      
      setMachinesMaster(machines);
      setMoldsMaster(molds);
      setScheduleData(schedules);
      setRawMaterialsMaster(rawMaterials);
      setPackingMaterialsMaster(packingMaterials);
      setLinesMaster(lines);
      setUnits(unitsData);
      
      // Load unit management settings
      try {
        const enabled = await unitManagementSettingsAPI.isUnitManagementEnabled();
        const defaultUnitSetting = await unitManagementSettingsAPI.getDefaultUnit();
        setUnitManagementEnabled(enabled);
        setDefaultUnit(defaultUnitSetting);
      } catch (error) {
        console.error('Error loading unit management settings:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
    setLoading(false);
  };

  const handleDataImported = () => {
    loadAllData().then(() => {
      // Force a re-render to ensure the sorted data is displayed
      setMachinesMaster(prev => [...prev]);
      setMoldsMaster(prev => [...prev]);
      setRawMaterialsMaster(prev => [...prev]);
      setPackingMaterialsMaster(prev => [...prev]);
      setLinesMaster(prev => [...prev]);
    });
  };

  const handleUnitFilterChange = (unit: string) => {
    setSelectedUnit(unit);
    
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerSelectedUnit_${userId}`, unit);
    }
  };

  // Validate selected unit when units are loaded
  useEffect(() => {
    if (units.length > 0 && selectedUnit !== 'all') {
      const availableUnitIds = units.map(unit => unit.id);
      if (!availableUnitIds.includes(selectedUnit)) {
        setSelectedUnit('all');
        if (typeof window !== 'undefined') {
          const userId = localStorage.getItem('currentUserId') || 'default';
          localStorage.setItem(`prodSchedulerSelectedUnit_${userId}`, 'all');
        }
      }
    }
  }, [units, selectedUnit]);

  const getAvailableUnits = (): { id: string; name: string }[] => {
    try {
      return units.map((unit: Unit) => ({ id: unit.id, name: unit.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting units:', error);
      return [];
    }
  };

  const getFilteredData = (): FilteredData => {
    if (selectedUnit === 'all') {
      return {
        machines: machinesMaster,
        molds: moldsMaster,
        lines: linesMaster,
        rawMaterials: rawMaterialsMaster,
        packingMaterials: packingMaterialsMaster
      };
    }
    
    const selectedUnitData = units.find(unit => unit.id === selectedUnit);
    const selectedUnitName = selectedUnitData?.name;
    
    if (!selectedUnitName) {
      return {
        machines: machinesMaster,
        molds: moldsMaster,
        lines: linesMaster,
        rawMaterials: rawMaterialsMaster,
        packingMaterials: packingMaterialsMaster
      };
    }
    
    return {
      machines: machinesMaster.filter((machine: Machine) => machine.unit === selectedUnitName),
      molds: moldsMaster.filter((mold: Mold) => mold.unit === selectedUnitName),
      lines: linesMaster.filter((line: Line) => line.unit === selectedUnitName),
      rawMaterials: rawMaterialsMaster.filter((material: RawMaterial) => material.unit === selectedUnitName),
      packingMaterials: packingMaterialsMaster.filter((material: PackingMaterial) => material.unit === selectedUnitName)
    };
  };

  return {
    machinesMaster,
    moldsMaster,
    rawMaterialsMaster,
    packingMaterialsMaster,
    linesMaster,
    scheduleData,
    units,
    unitManagementEnabled,
    defaultUnit,
    loading,
    selectedUnit,
    loadAllData,
    handleDataImported,
    handleUnitFilterChange,
    getFilteredData,
    getAvailableUnits,
    setMachinesMaster,
    setMoldsMaster,
    setRawMaterialsMaster,
    setPackingMaterialsMaster,
    setLinesMaster
  };
}

