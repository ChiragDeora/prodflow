import React, { useState } from 'react';

interface ProductDetail {
  id: string;
  productName: string;
  productCode: string;
  quantityPerCarton: string;
  cartonQuantity: string;
  grossWeight: string;
}

interface ContainerInspectionData {
  customerName: string;
  containerLoadingDate: string;
  containerNumber: string;
  destination: string;
  shippingNumber: string;
  containerType: string;
  shippingCompany: string;
  incomingOutgoing: string;
  products: ProductDetail[];
  checklist: {
    abnormalSmell: string;
    cleanInsideOutside: string;
    cleanSurfaces: string;
    freeFromCracks: string;
  };
  finalDecision: string;
  inspectorName: string;
  inspectionDate: string;
}

const ContainerInspectionForm: React.FC = () => {
  const [formData, setFormData] = useState<ContainerInspectionData>({
    customerName: '',
    containerLoadingDate: '',
    containerNumber: '',
    destination: '',
    shippingNumber: '',
    containerType: '',
    shippingCompany: '',
    incomingOutgoing: '',
    products: [
      { id: '1', productName: '', productCode: '', quantityPerCarton: '', cartonQuantity: '', grossWeight: '' }
    ],
    checklist: {
      abnormalSmell: '',
      cleanInsideOutside: '',
      cleanSurfaces: '',
      freeFromCracks: ''
    },
    finalDecision: '',
    inspectorName: '',
    inspectionDate: new Date().toISOString().split('T')[0]
  });

  const handleInputChange = (field: keyof ContainerInspectionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChecklistChange = (field: keyof ContainerInspectionData['checklist'], value: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [field]: value
      }
    }));
  };

  const handleProductChange = (id: string, field: keyof ProductDetail, value: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(product =>
        product.id === id ? { ...product, [field]: value } : product
      )
    }));
  };

  const addProductRow = () => {
    const newProduct: ProductDetail = {
      id: Date.now().toString(),
      productName: '',
      productCode: '',
      quantityPerCarton: '',
      cartonQuantity: '',
      grossWeight: ''
    };
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
  };

  const removeProductRow = (id: string) => {
    if (formData.products.length > 1) {
      setFormData(prev => ({
        ...prev,
        products: prev.products.filter(product => product.id !== id)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Container Inspection submitted:', formData);
    // Here you would typically send the data to your backend
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">CONTAINER INSPECTION REPORT</h2>
        </div>

        {/* General Container Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">General Container Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer name :-</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Container loading date :-</label>
                <input
                  type="date"
                  value={formData.containerLoadingDate}
                  onChange={(e) => handleInputChange('containerLoadingDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Container number :-</label>
                <input
                  type="text"
                  value={formData.containerNumber}
                  onChange={(e) => handleInputChange('containerNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination :-</label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping number :-</label>
                <input
                  type="text"
                  value={formData.shippingNumber}
                  onChange={(e) => handleInputChange('shippingNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Container type :-</label>
                <select
                  value={formData.containerType}
                  onChange={(e) => handleInputChange('containerType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Container Type</option>
                  <option value="20ft">20ft Container</option>
                  <option value="40ft">40ft Container</option>
                  <option value="40ft-hc">40ft High Cube</option>
                  <option value="45ft-hc">45ft High Cube</option>
                  <option value="reefer">Reefer Container</option>
                  <option value="flat-rack">Flat Rack</option>
                  <option value="open-top">Open Top</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping company :-</label>
                <input
                  type="text"
                  value={formData.shippingCompany}
                  onChange={(e) => handleInputChange('shippingCompany', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incoming / Outgoing :-</label>
                <select
                  value={formData.incomingOutgoing}
                  onChange={(e) => handleInputChange('incomingOutgoing', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Table */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
            <button
              type="button"
              onClick={addProductRow}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Product Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Product Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity Per Carton</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Carton Quantity</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Gross Weight</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.products.map((product) => (
                  <tr key={product.id}>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={product.productName}
                        onChange={(e) => handleProductChange(product.id, 'productName', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter product name"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={product.productCode}
                        onChange={(e) => handleProductChange(product.id, 'productCode', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter product code"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.quantityPerCarton}
                        onChange={(e) => handleProductChange(product.id, 'quantityPerCarton', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Quantity"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.cartonQuantity}
                        onChange={(e) => handleProductChange(product.id, 'cartonQuantity', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Cartons"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.grossWeight}
                        onChange={(e) => handleProductChange(product.id, 'grossWeight', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Weight (kg)"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {formData.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProductRow(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Container Checklist */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Container Checklist</h3>
          <p className="text-sm text-gray-600 mb-4">Complete the checklist by ticking (✓) when applicable the boxes under the column Yes or No</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Checklist Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Yes</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">No</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">Any Abnormal Smell in the container</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="abnormalSmell"
                      value="yes"
                      checked={formData.checklist.abnormalSmell === 'yes'}
                      onChange={(e) => handleChecklistChange('abnormalSmell', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="abnormalSmell"
                      value="no"
                      checked={formData.checklist.abnormalSmell === 'no'}
                      onChange={(e) => handleChecklistChange('abnormalSmell', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">All inside & outside of the container are free from significant clean</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="cleanInsideOutside"
                      value="yes"
                      checked={formData.checklist.cleanInsideOutside === 'yes'}
                      onChange={(e) => handleChecklistChange('cleanInsideOutside', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="cleanInsideOutside"
                      value="no"
                      checked={formData.checklist.cleanInsideOutside === 'no'}
                      onChange={(e) => handleChecklistChange('cleanInsideOutside', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">All inside surfaces of the container are clean. Outside areas are reasonably clean</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="cleanSurfaces"
                      value="yes"
                      checked={formData.checklist.cleanSurfaces === 'yes'}
                      onChange={(e) => handleChecklistChange('cleanSurfaces', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="cleanSurfaces"
                      value="no"
                      checked={formData.checklist.cleanSurfaces === 'no'}
                      onChange={(e) => handleChecklistChange('cleanSurfaces', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">The container is free from cracks, gaps or holes</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="freeFromCracks"
                      value="yes"
                      checked={formData.checklist.freeFromCracks === 'yes'}
                      onChange={(e) => handleChecklistChange('freeFromCracks', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="radio"
                      name="freeFromCracks"
                      value="no"
                      checked={formData.checklist.freeFromCracks === 'no'}
                      onChange={(e) => handleChecklistChange('freeFromCracks', e.target.value)}
                      className="w-4 h-4"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Release/Rejection Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Decision</h3>
          <p className="text-sm text-gray-600 mb-4">Tick (✓) the box released or rejected as appropriate</p>
          
          <div className="flex space-x-8">
            <label className="flex items-center">
              <input
                type="radio"
                name="finalDecision"
                value="released"
                checked={formData.finalDecision === 'released'}
                onChange={(e) => handleInputChange('finalDecision', e.target.value)}
                className="w-4 h-4 mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Released</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="finalDecision"
                value="rejected"
                checked={formData.finalDecision === 'rejected'}
                onChange={(e) => handleInputChange('finalDecision', e.target.value)}
                className="w-4 h-4 mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Rejected</span>
            </label>
          </div>
        </div>

        {/* Inspector Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inspector Name</label>
            <input
              type="text"
              value={formData.inspectorName}
              onChange={(e) => handleInputChange('inspectorName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Date</label>
            <input
              type="date"
              value={formData.inspectionDate}
              onChange={(e) => handleInputChange('inspectionDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
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

export default ContainerInspectionForm;
