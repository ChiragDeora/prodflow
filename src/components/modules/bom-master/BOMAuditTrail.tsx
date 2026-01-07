'use client';

import React from 'react';
import { X, History, User, Clock, FileText, AlertCircle } from 'lucide-react';
import type { BOMMasterWithVersions, BOMAudit } from '@/lib/supabase';

interface BOMAuditTrailProps {
  bom: BOMMasterWithVersions;
  auditData: BOMAudit[];
  onClose: () => void;
}

const BOMAuditTrail: React.FC<BOMAuditTrailProps> = ({ bom, auditData, onClose }) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <FileText className="w-4 h-4" />;
      case 'UPDATE':
        return <AlertCircle className="w-4 h-4" />;
      case 'DELETE':
        return <X className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatAuditValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <History className="w-6 h-6 text-gray-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>
                <p className="text-sm text-gray-500">
                  {bom.item_name || bom.sfg_code || bom.item_code} ({bom.sfg_code || bom.item_code})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Audit Trail Information</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This audit trail shows all changes made to this BOM. Once a BOM is released, 
                  it becomes immutable and cannot be modified. All changes are permanently recorded.
                </p>
              </div>
            </div>
          </div>

          {auditData.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No audit trail data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditData.map((audit, index) => (
                <div key={audit.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getActionColor(audit.action)}`}>
                        {getActionIcon(audit.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(audit.action)}`}>
                            {audit.action}
                          </span>
                          <span className="text-sm text-gray-500">
                            {audit.table_name}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            <span>Changed by: {audit.changed_by}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>
                              {new Date(audit.changed_at || '').toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {audit.change_reason && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Reason:</strong> {audit.change_reason}
                            </p>
                          </div>
                        )}

                        {(audit.old_values || audit.new_values) && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {audit.old_values && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Previous Values</h5>
                                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                                  {formatAuditValue(audit.old_values)}
                                </pre>
                              </div>
                            )}
                            {audit.new_values && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">New Values</h5>
                                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                                  {formatAuditValue(audit.new_values)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Total audit entries: {auditData.length}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMAuditTrail;
