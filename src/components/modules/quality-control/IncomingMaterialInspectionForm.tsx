import React, { useState } from 'react';

interface InspectionFormData {
  date: string;
  invoiceNo: string;
  invoiceDate: string;
  supplier: string;
  batchNumber: string;
  batchQuantity: string;
  description: string;
  coaReceived: string;
  sampleSize: string;
  overallAssessment: string;
  inspectorName: string;
  comments: string;
  parameters: {
    [key: string]: {
      samples: { [key: string]: string };
      observation: string;
    };
  };
}

const IncomingMaterialInspectionForm: React.FC = () => {
  const [formData, setFormData] = useState<InspectionFormData>({
    date: new Date().toISOString().split('T')[0],
    invoiceNo: '',
    invoiceDate: '',
    supplier: '',
    batchNumber: '',
    batchQuantity: '',
    description: '',
    coaReceived: '',
    sampleSize: '',
    overallAssessment: '',
    inspectorName: '',
    comments: '',
    parameters: {}
  });

  const handleInputChange = (field: keyof InspectionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParameterChange = (parameter: string, field: 'observation', value: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [parameter]: {
          ...prev.parameters[parameter],
          [field]: value
        }
      }
    }));
  };

  const handleSampleChange = (parameter: string, sampleIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [parameter]: {
          ...prev.parameters[parameter],
          samples: {
            ...prev.parameters[parameter]?.samples,
            [sampleIndex]: value
          }
        }
      }
    }));
  };

  // Get the number of samples based on sample size input
  const getSampleCount = () => {
    const size = parseInt(formData.sampleSize) || 0;
    return Math.max(0, Math.min(size, 10)); // Limit to 10 samples max
  };

  // Generate sample column headers
  const generateSampleHeaders = () => {
    const count = getSampleCount();
    return Array.from({ length: count }, (_, i) => `Sample - ${String(i + 1).padStart(2, '0')}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your backend
  };

  const inspectionParameters = [
    {
      name: 'Visual Appearance',
      standard: 'Standard, well-maintained with proper markings/labels',
      type: 'select'
    },
    {
      name: 'Dimensions (L x W x H)',
      standard: 'As per specification',
      type: 'input'
    },
    {
      name: 'Packing Condition',
      standard: 'Good Condition, no damages, (Sealing/Folding) Presence of dust, or other foreign materials',
      type: 'select'
    },
    {
      name: 'Hygiene Condition',
      standard: 'Free from any contamination',
      type: 'select'
    },
    {
      name: 'Odour/Smell',
      standard: 'Free from objectionable Odour/Smell',
      type: 'select'
    },
    {
      name: 'Weight',
      standard: 'As per standard',
      type: 'input'
    },
    {
      name: 'MFI (FOR RM)',
      standard: 'As per specification or supplier\'s COA/DOC',
      type: 'input'
    },
    {
      name: 'Density (FOR RM)',
      standard: 'As per specification or supplier\'s COA/DOC',
      type: 'input'
    },
    {
      name: 'G.S.M.',
      standard: 'G.S.M. / Micron',
      type: 'input'
    },
    {
      name: 'Bursting Strength Test (BST) (For corrugated box)',
      standard: 'As per specification',
      type: 'input'
    },
    {
      name: 'Box Compression Test (BCT) (For corrugated box)',
      standard: 'As per specification',
      type: 'input'
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 text-center mb-4">INCOMING MATERIAL INSPECTION REPORT</h3>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">DATE:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">INVOICE NO.:</label>
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter invoice number"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">INVOICE DATE:</label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name of Supplier</label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => handleInputChange('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter supplier name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch No. / Lot No.</label>
            <input
              type="text"
              value={formData.batchNumber}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter batch/lot number"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Quantity</label>
            <input
              type="text"
              value={formData.batchQuantity}
              onChange={(e) => handleInputChange('batchQuantity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter batch quantity"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description of Items</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter item description"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Is C.O.A. Received?</label>
            <select
              value={formData.coaReceived}
              onChange={(e) => handleInputChange('coaReceived', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sample Size</label>
            <input
              type="number"
              value={formData.sampleSize}
              onChange={(e) => handleInputChange('sampleSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter sample size"
              min="1"
              max="10"
              required
            />
          </div>
        </div>

        {/* Inspection Parameters Table */}
        <div className="overflow-x-auto mb-6">
          {getSampleCount() === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800">
                Please enter a sample size above to generate the inspection parameters table.
              </p>
            </div>
          ) : (
            <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Inspection Parameters</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Standard/Unit</th>
                {generateSampleHeaders().map((header, index) => (
                  <th key={index} className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    {header}
                  </th>
                ))}
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Observation</th>
              </tr>
            </thead>
            <tbody>
              {inspectionParameters.map((param, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2 text-sm">{param.name}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">{param.standard}</td>
                  {Array.from({ length: getSampleCount() }, (_, sampleIndex) => (
                    <td key={sampleIndex} className="border border-gray-300 px-4 py-2">
                      {param.type === 'select' ? (
                        <select
                          value={formData.parameters[param.name]?.samples?.[sampleIndex] || ''}
                          onChange={(e) => handleSampleChange(param.name, sampleIndex, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select</option>
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.parameters[param.name]?.samples?.[sampleIndex] || ''}
                          onChange={(e) => handleSampleChange(param.name, sampleIndex, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder={param.name.includes('Dimensions') ? 'L x W x H' : 'Value'}
                        />
                      )}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2">
                    <textarea
                      value={formData.parameters[param.name]?.observation || ''}
                      onChange={(e) => handleParameterChange(param.name, 'observation', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      rows={2}
                      placeholder="Enter observations"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {/* Final Assessment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Assessment</label>
            <select
              value={formData.overallAssessment}
              onChange={(e) => handleInputChange('overallAssessment', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Assessment</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="conditional">Conditional Pass</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inspector Name</label>
            <input
              type="text"
              value={formData.inspectorName}
              onChange={(e) => handleInputChange('inspectorName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter inspector name"
              required
            />
          </div>
        </div>

        {/* Comments */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter any additional comments or observations"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Save Draft
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Submit Report
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncomingMaterialInspectionForm;
