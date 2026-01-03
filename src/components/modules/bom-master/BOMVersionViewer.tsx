'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Eye, CheckCircle, Clock, AlertTriangle, Package, History } from 'lucide-react';
import type { BOMMasterWithVersions, BOMVersion, BOMComponent } from '@/lib/supabase';

interface BOMVersionViewerProps {
  bom: BOMMasterWithVersions;
  onClose: () => void;
}

const BOMVersionViewer: React.FC<BOMVersionViewerProps> = ({ bom, onClose }) => {
  const [versions, setVersions] = useState<BOMVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<BOMVersion | null>(null);
  const [showCreateVersion, setShowCreateVersion] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [bom.id]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bom/${bom.id}/versions`);
      const result = await response.json();
      
      if (result.success) {
        setVersions(result.data);
        // Select the active version by default
        const activeVersion = result.data.find((v: BOMVersion) => v.is_active);
        if (activeVersion) {
          setSelectedVersion(activeVersion);
        }
      } else {
        console.error('Failed to load versions:', result.error);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (versionData: any) => {
    try {
      const response = await fetch(`/api/bom/${bom.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(versionData),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadVersions();
        setShowCreateVersion(false);
        alert('New version created successfully!');
      } else {
        alert(`Failed to create version: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Failed to create version');
    }
  };

  const handleActivateVersion = async (versionId: string) => {
    try {
      const response = await fetch(`/api/bom/versions/${versionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'activate',
          updatedBy: 'current_user'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadVersions();
        alert('Version activated successfully!');
      } else {
        alert(`Failed to activate version: ${result.error}`);
      }
    } catch (error) {
      console.error('Error activating version:', error);
      alert('Failed to activate version');
    }
  };

  const getStatusIcon = (version: BOMVersion) => {
    if (version.is_active) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (version: BOMVersion) => {
    if (version.is_active) {
      return 'bg-green-50 border-green-200 text-green-800';
    }
    return 'bg-gray-50 border-gray-200 text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                BOM Versions - {bom.product_name}
              </h3>
              <p className="text-sm text-gray-500">
                Code: {bom.product_code} • Category: {bom.category}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateVersion(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Version
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Versions List */}
            <div className="lg:col-span-1">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Versions ({versions.length})</h4>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No versions found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id
                          ? 'border-blue-300 bg-blue-50'
                          : getStatusColor(version)
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getStatusIcon(version)}
                          <span className="ml-2 font-medium">
                            v{version.version_number}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {version.total_components} components
                        </div>
                      </div>
                      {version.version_name && (
                        <p className="text-xs text-gray-600 mt-1">{version.version_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(version.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Version Details */}
            <div className="lg:col-span-2">
              {selectedVersion ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-900">
                      Version {selectedVersion.version_number} Details
                    </h4>
                    {!selectedVersion.is_active && (
                      <button
                        onClick={() => handleActivateVersion(selectedVersion.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className={`ml-2 font-medium ${
                          selectedVersion.is_active ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {selectedVersion.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Components:</span>
                        <span className="ml-2 font-medium">{selectedVersion.total_components}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="ml-2 font-medium">${selectedVersion.total_cost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-2 font-medium">
                          {new Date(selectedVersion.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedVersion.notes && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Notes</h5>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {selectedVersion.notes}
                      </p>
                    </div>
                  )}

                  {selectedVersion.change_reason && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Change Reason</h5>
                      <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                        {selectedVersion.change_reason}
                      </p>
                    </div>
                  )}

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Components</h5>
                    {selectedVersion.components && selectedVersion.components.length > 0 ? (
                      <div className="space-y-2">
                        {selectedVersion.components.map((component: BOMComponent, index: number) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h6 className="font-medium text-gray-900">{component.component_name}</h6>
                                <p className="text-sm text-gray-500">Code: {component.component_code}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {component.quantity} {component.unit_of_measure}
                                </p>
                                <p className="text-sm text-gray-500">
                                  ${component.total_cost.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {component.is_critical && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Critical Component
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No components defined</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a version to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMVersionViewer;
