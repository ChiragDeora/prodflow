'use client';

import React from 'react';
import { Info, X } from 'lucide-react';
import type { ColumnInfo } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  infoType: string;
}

// Column information for different data types
const COLUMN_INFO: Record<string, ColumnInfo[]> = {
  machines: [
    { column: 'Sr. No.', description: 'Machine ID (e.g., JSW-1, HAIT-1, WITT-1). Unique identifier for each machine in the system.' },
    { column: 'Category', description: 'Machine category (IM, Robot, Aux, Utility). IM = Injection Molding, Robot = Robotic equipment, Aux = Auxiliary equipment, Utility = Utility equipment.' },
    { column: 'Make', description: 'Manufacturer name (e.g., JSW, Haitain, Wittmaan, Switek). The company that manufactured the machine.' },
    { column: 'Size', description: 'Machine capacity in tons (e.g., 280T, 350T, 380T). Represents the clamping force or capacity of the machine.' },
    { column: 'Model', description: 'Machine model number (e.g., J-280-ADS, MA3800H/1280PRO). Specific model designation from the manufacturer.' },
    { column: 'Serial No.', description: 'Machine serial number. For IM machines: Format is "CLM_SERIAL/INJ_SERIAL". For other machines: Single serial number.' },
    { column: 'Mfg Date', description: 'Manufacturing date when the machine was built by the manufacturer.' },
    { column: 'Inst Date', description: 'Installation date when the machine started production in your factory.' },
    { column: 'Dimensions', description: 'Physical dimensions of the machine. For IM machines: Format is "LxBxH" (Length x Breadth x Height) in mm.' },
    { column: 'Name Plate', description: 'View machine nameplate details and specifications.' },
    { column: 'Status', description: 'Machine operational status. Active = In production, Maintenance = Under maintenance/repair, Idle = Available but not in use.' },
    { column: 'Actions', description: 'Available actions: View details, Edit machine information, Delete machine from system.' }
  ],
  molds: [
    { column: 'Item Code', description: 'Mold ID (e.g., RP-1, RP-2). Unique identifier for each mold in the system.' },
    { column: 'Item Name', description: 'Product name (e.g., Ro10-C, Ro48-C). Name of the product that this mold produces.' },
    { column: 'Type', description: 'Mold type (e.g., Injection Mold, Container, Lid). Classification of the mold based on its purpose.' },
    { column: 'Cavity', description: 'Number of cavities in the mold. How many parts can be produced in one cycle.' },
    { column: 'Cycle Time', description: 'Production cycle time in seconds. Time required to complete one production cycle.' },
    { column: 'Int. Wt.', description: 'Internal weight in grams. Internal weight of the finished product from this mold.' },
    { column: 'HRC Zone', description: 'Hot Runner Control Zone. Zone designation for hot runner temperature control.' },
    { column: 'Make', description: 'Mold manufacturer. Company that manufactured the mold.' },
    { column: 'Status', description: 'Mold operational status. Active = In production, Maintenance = Under maintenance/repair, Idle = Available but not in use.' },
    { column: 'Actions', description: 'Available actions: View details, Edit mold information, Delete mold from system.' }
  ],
  raw_materials: [
    { column: 'Sl. No.', description: 'Serial number for raw material identification. Sequential numbering for easy reference.' },
    { column: 'Category', description: 'Material category (e.g., PP, PE, ABS). Primary classification of the raw material type.' },
    { column: 'Type', description: 'Material type specification (e.g., HP, ICP, RCP, LDPE, MB). Specific type and grade classification.' },
    { column: 'Grade', description: 'Material grade specification. Quality and performance classification of the material.' },
    { column: 'Supplier', description: 'Material supplier name. Company that supplies the raw material.' },
    { column: 'MFI', description: 'Melt Flow Index. Measure of material flow characteristics during processing.' },
    { column: 'Density', description: 'Material density in g/cm³. Physical property indicating material weight per unit volume.' },
    { column: 'TDS', description: 'Technical Data Sheet image. Click to view the TDS document for detailed material specifications.' },
    { column: 'Actions', description: 'Available actions: View details, Edit material information, Delete material from system.' }
  ],
  packing_materials: [
    { column: 'Category', description: 'Packing material category (e.g., Boxes, PolyBags, Bopp). Classification of the packing material type.' },
    { column: 'Type', description: 'Packing material type (e.g., Export, Local). Specific type or variant of the packing material.' },
    { column: 'Item Code', description: 'Unique item code for the packing material. Product identifier for inventory management.' },
    { column: 'Pack Size', description: 'Quantity per pack. Number of items or units in one pack.' },
    { column: 'Dimensions', description: 'Physical dimensions of the packing material (e.g., LxBxH format). Size specifications for storage and handling.' },
    { column: 'Technical Detail', description: 'Technical specifications and requirements. Detailed technical information about the packing material.' },
    { column: 'Brand', description: 'Brand or manufacturer name. Company that manufactures or supplies the packing material.' },
    { column: 'Actions', description: 'Available actions: View details, Edit packing material information, Delete packing material from system.' }
  ]
};

const MODAL_TITLES: Record<string, string> = {
  machines: 'Machine Master Columns',
  molds: 'Mold Master Columns',
  raw_materials: 'RM Master Columns',
  packing_materials: 'PM Master Columns'
};

const MODAL_DESCRIPTIONS: Record<string, string> = {
  machines: 'Understanding the machine master table columns and their meanings.',
  molds: 'Understanding the mold master table columns and their meanings.',
  raw_materials: 'Understanding the RM master table columns and their meanings.',
  packing_materials: 'Understanding the PM master table columns and their meanings.'
};

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, infoType }) => {
  if (!isOpen) return null;
  
  const columnInfo = COLUMN_INFO[infoType] || [];
  const title = MODAL_TITLES[infoType] || 'Table Columns';
  const description = MODAL_DESCRIPTIONS[infoType] || 'Information about table columns.';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {columnInfo.map((item, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-32 font-medium text-gray-900">
                  {item.column}
                </div>
                <div className="flex-1 text-gray-700">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;

