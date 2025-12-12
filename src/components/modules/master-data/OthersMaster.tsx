'use client';

import React from 'react';
import ColorLabelMaster from './ColorLabelMaster';
import PartyNameMaster from './PartyNameMaster';

type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material' | 'packing_material' | 'color_label' | 'party_name';

interface OthersMasterProps {
  handleAction: (actionType: ActionType, item: any, itemType: ItemType | 'line' | 'color_label' | 'party_name') => Promise<void>;
  openExcelReader?: (type: string) => void;
}

const OthersMaster: React.FC<OthersMasterProps> = ({
  handleAction,
  openExcelReader
}) => {
  return (
    <div className="space-y-8">
      {/* Color/Label Master Section */}
      <ColorLabelMaster handleAction={handleAction} openExcelReader={openExcelReader} />

      {/* Separator */}
      <div className="border-t border-gray-300 my-8"></div>

      {/* Party Name Master Section */}
      <PartyNameMaster handleAction={handleAction} openExcelReader={openExcelReader} />
    </div>
  );
};

export default OthersMaster;

