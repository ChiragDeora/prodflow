'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ==================== FORM DATA TYPES ====================

interface MaterialIndentItem {
  id: string;
  itemCode: string;
  itemName: string;
  dimension: string;
  packSize: string;
  qty: string;
  uom: string;
  partyName: string;
  colorRemarks: string;
}

interface MaterialIndentSlipFormData {
  identNo: string;
  indentDate: string;
  tentativeDate: string;
  partyName: string;
  partyId: string;
  address: string;
  state: string;
  gstNo: string;
  materialType: 'RM' | 'PM' | '';
  deptHeadSign: string;
  storeInchSign: string;
  plantHeadSign: string;
  items: MaterialIndentItem[];
}

interface PurchaseOrderItem {
  id: string;
  itemCode: string;
  description: string;
  qty: string;
  unit: string;
  rate: string;
  totalPrice: string;
}

interface PurchaseOrderFormData {
  poNo: string;
  poDate: string;
  refNo: string;
  refDate: string;
  partyName: string;
  partyId: string;
  address: string;
  state: string;
  gstNo: string;
  capitalOperational: 'Capital' | 'Operational' | '';
  totalAmt: string;
  gstPercentage: string;
  finalAmt: string;
  amountInWords: string;
  deliveryAddress: string;
  deliveryTerms: string;
  paymentTerms: string;
  packingCharges: string;
  inspection: string;
  warranty: string;
  otherTerms: string;
  items: PurchaseOrderItem[];
}

interface DeliveryChallanItem {
  id: string;
  itemCode: string;
  itemDescription: string;
  hsnCode: string;
  uom: string;
  packSize: string;
  boxNo: string;
  noOfPcs: string;
  value: string;
}

interface DeliveryChallanFormData {
  dcNo: string;
  dcDate: string;
  poNo: string;
  vehicleNo: string;
  lrNo: string;
  returnable: boolean;
  partyName: string;
  partyId: string;
  address: string;
  state: string;
  gstNo: string;
  items: DeliveryChallanItem[];
}

interface DispatchItem {
  id: string;
  itemName: string;
  noBox: string;
  remarks: string;
}

interface DispatchMemoFormData {
  memoNo: string;
  date: string;
  partyName: string;
  partyId: string;
  location: string;
  preparedBy: string;
  checkedBy: string;
  items: DispatchItem[];
}

interface GRNItem {
  id: string;
  description: string;
  poQty: string;
  grnQty: string;
  rate: string;
  totalPrice: string;
}

interface GRNFormData {
  grnNo: string;
  grnDate: string;
  poNo: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  partyId: string;
  address: string;
  state: string;
  gstNo: string;
  totalAmount: string;
  freightOthers: string;
  igstPercentage: string;
  cgstPercentage: string;
  utgstPercentage: string;
  roundOff: string;
  finalAmount: string;
  amountInWords: string;
  items: GRNItem[];
}

// ==================== CONTEXT TYPE ====================

interface StoreDispatchContextType {
  // Active tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  purchaseSubTab: string | null;
  setPurchaseSubTab: (tab: string | null) => void;
  inwardSubTab: string | null;
  setInwardSubTab: (tab: string | null) => void;
  outwardSubTab: string | null;
  setOutwardSubTab: (tab: string | null) => void;
  salesSubTab: string | null;
  setSalesSubTab: (tab: string | null) => void;

  // Material Indent Slip Form
  materialIndentFormData: MaterialIndentSlipFormData;
  setMaterialIndentFormData: (data: MaterialIndentSlipFormData) => void;
  updateMaterialIndentField: <K extends keyof MaterialIndentSlipFormData>(field: K, value: MaterialIndentSlipFormData[K]) => void;
  resetMaterialIndentForm: () => void;

  // Purchase Order Form
  purchaseOrderFormData: PurchaseOrderFormData;
  setPurchaseOrderFormData: (data: PurchaseOrderFormData) => void;
  updatePurchaseOrderField: <K extends keyof PurchaseOrderFormData>(field: K, value: PurchaseOrderFormData[K]) => void;
  resetPurchaseOrderForm: () => void;

  // Delivery Challan Form
  deliveryChallanFormData: DeliveryChallanFormData;
  setDeliveryChallanFormData: (data: DeliveryChallanFormData) => void;
  updateDeliveryChallanField: <K extends keyof DeliveryChallanFormData>(field: K, value: DeliveryChallanFormData[K]) => void;
  resetDeliveryChallanForm: () => void;

  // Dispatch Memo Form
  dispatchMemoFormData: DispatchMemoFormData;
  setDispatchMemoFormData: (data: DispatchMemoFormData) => void;
  updateDispatchMemoField: <K extends keyof DispatchMemoFormData>(field: K, value: DispatchMemoFormData[K]) => void;
  resetDispatchMemoForm: () => void;

  // GRN Form
  grnFormData: GRNFormData;
  setGrnFormData: (data: GRNFormData) => void;
  updateGrnField: <K extends keyof GRNFormData>(field: K, value: GRNFormData[K]) => void;
  resetGrnForm: () => void;
}

// ==================== DEFAULT VALUES ====================

const getDefaultMaterialIndentForm = (): MaterialIndentSlipFormData => ({
  identNo: '',
  indentDate: new Date().toISOString().split('T')[0],
  tentativeDate: '',
  partyName: '',
  partyId: '',
  address: '',
  state: '',
  gstNo: '',
  materialType: '',
  deptHeadSign: '',
  storeInchSign: '',
  plantHeadSign: '',
  items: [{ id: '1', itemCode: '', itemName: '', dimension: '', packSize: '', qty: '', uom: '', partyName: '', colorRemarks: '' }]
});

const getDefaultPurchaseOrderForm = (): PurchaseOrderFormData => ({
  poNo: '',
  poDate: new Date().toISOString().split('T')[0],
  refNo: '',
  refDate: '',
  partyName: '',
  partyId: '',
  address: '',
  state: '',
  gstNo: '',
  capitalOperational: 'Capital',
  totalAmt: '',
  gstPercentage: '18',
  finalAmt: '',
  amountInWords: '',
  deliveryAddress: 'Plot 32&33, Silver Industrial Estate, Village Bhimpore, Nani Daman - 396 210',
  deliveryTerms: '',
  paymentTerms: '',
  packingCharges: '',
  inspection: '',
  warranty: '',
  otherTerms: '',
  items: [{ id: '1', itemCode: '', description: '', qty: '', unit: '', rate: '', totalPrice: '' }]
});

const getDefaultDeliveryChallanForm = (): DeliveryChallanFormData => ({
  dcNo: '',
  dcDate: new Date().toISOString().split('T')[0],
  poNo: '',
  vehicleNo: '',
  lrNo: '',
  returnable: false,
  partyName: '',
  partyId: '',
  address: '',
  state: '',
  gstNo: '',
  items: [{ id: '1', itemCode: '', itemDescription: '', hsnCode: '', uom: '', packSize: '', boxNo: '', noOfPcs: '', value: '' }]
});

const getDefaultDispatchMemoForm = (): DispatchMemoFormData => ({
  memoNo: '',
  date: new Date().toISOString().split('T')[0],
  partyName: '',
  partyId: '',
  location: '',
  preparedBy: '',
  checkedBy: '',
  items: [{ id: '1', itemName: '', noBox: '', remarks: '' }]
});

const getDefaultGrnForm = (): GRNFormData => ({
  grnNo: '',
  grnDate: new Date().toISOString().split('T')[0],
  poNo: '',
  poDate: '',
  invoiceNo: '',
  invoiceDate: '',
  partyName: '',
  partyId: '',
  address: '',
  state: '',
  gstNo: '',
  totalAmount: '',
  freightOthers: '',
  igstPercentage: '',
  cgstPercentage: '',
  utgstPercentage: '',
  roundOff: '',
  finalAmount: '',
  amountInWords: '',
  items: [{ id: '1', description: '', poQty: '', grnQty: '', rate: '', totalPrice: '' }]
});

// ==================== CONTEXT ====================

const StoreDispatchContext = createContext<StoreDispatchContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export const StoreDispatchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('purchase');
  const [purchaseSubTab, setPurchaseSubTab] = useState<string | null>(null);
  const [inwardSubTab, setInwardSubTab] = useState<string | null>(null);
  const [outwardSubTab, setOutwardSubTab] = useState<string | null>(null);
  const [salesSubTab, setSalesSubTab] = useState<string | null>(null);

  // Form states
  const [materialIndentFormData, setMaterialIndentFormData] = useState<MaterialIndentSlipFormData>(getDefaultMaterialIndentForm);
  const [purchaseOrderFormData, setPurchaseOrderFormData] = useState<PurchaseOrderFormData>(getDefaultPurchaseOrderForm);
  const [deliveryChallanFormData, setDeliveryChallanFormData] = useState<DeliveryChallanFormData>(getDefaultDeliveryChallanForm);
  const [dispatchMemoFormData, setDispatchMemoFormData] = useState<DispatchMemoFormData>(getDefaultDispatchMemoForm);
  const [grnFormData, setGrnFormData] = useState<GRNFormData>(getDefaultGrnForm);

  // Material Indent Form helpers
  const updateMaterialIndentField = useCallback(<K extends keyof MaterialIndentSlipFormData>(
    field: K,
    value: MaterialIndentSlipFormData[K]
  ) => {
    setMaterialIndentFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetMaterialIndentForm = useCallback(() => {
    setMaterialIndentFormData(getDefaultMaterialIndentForm());
  }, []);

  // Purchase Order Form helpers
  const updatePurchaseOrderField = useCallback(<K extends keyof PurchaseOrderFormData>(
    field: K,
    value: PurchaseOrderFormData[K]
  ) => {
    setPurchaseOrderFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetPurchaseOrderForm = useCallback(() => {
    setPurchaseOrderFormData(getDefaultPurchaseOrderForm());
  }, []);

  // Delivery Challan Form helpers
  const updateDeliveryChallanField = useCallback(<K extends keyof DeliveryChallanFormData>(
    field: K,
    value: DeliveryChallanFormData[K]
  ) => {
    setDeliveryChallanFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetDeliveryChallanForm = useCallback(() => {
    setDeliveryChallanFormData(getDefaultDeliveryChallanForm());
  }, []);

  // Dispatch Memo Form helpers
  const updateDispatchMemoField = useCallback(<K extends keyof DispatchMemoFormData>(
    field: K,
    value: DispatchMemoFormData[K]
  ) => {
    setDispatchMemoFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetDispatchMemoForm = useCallback(() => {
    setDispatchMemoFormData(getDefaultDispatchMemoForm());
  }, []);

  // GRN Form helpers
  const updateGrnField = useCallback(<K extends keyof GRNFormData>(
    field: K,
    value: GRNFormData[K]
  ) => {
    setGrnFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetGrnForm = useCallback(() => {
    setGrnFormData(getDefaultGrnForm());
  }, []);

  const value: StoreDispatchContextType = {
    activeTab,
    setActiveTab,
    purchaseSubTab,
    setPurchaseSubTab,
    inwardSubTab,
    setInwardSubTab,
    outwardSubTab,
    setOutwardSubTab,
    salesSubTab,
    setSalesSubTab,
    materialIndentFormData,
    setMaterialIndentFormData,
    updateMaterialIndentField,
    resetMaterialIndentForm,
    purchaseOrderFormData,
    setPurchaseOrderFormData,
    updatePurchaseOrderField,
    resetPurchaseOrderForm,
    deliveryChallanFormData,
    setDeliveryChallanFormData,
    updateDeliveryChallanField,
    resetDeliveryChallanForm,
    dispatchMemoFormData,
    setDispatchMemoFormData,
    updateDispatchMemoField,
    resetDispatchMemoForm,
    grnFormData,
    setGrnFormData,
    updateGrnField,
    resetGrnForm,
  };

  return (
    <StoreDispatchContext.Provider value={value}>
      {children}
    </StoreDispatchContext.Provider>
  );
};

// ==================== HOOK ====================

export const useStoreDispatch = () => {
  const context = useContext(StoreDispatchContext);
  if (context === undefined) {
    throw new Error('useStoreDispatch must be used within a StoreDispatchProvider');
  }
  return context;
};

// Export types for use in form components
export type {
  MaterialIndentSlipFormData,
  MaterialIndentItem,
  PurchaseOrderFormData,
  PurchaseOrderItem,
  DeliveryChallanFormData,
  DeliveryChallanItem,
  DispatchMemoFormData,
  DispatchItem,
  GRNFormData,
  GRNItem,
};

