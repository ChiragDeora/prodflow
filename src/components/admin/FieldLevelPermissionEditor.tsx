'use client';

import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Edit, 
  Lock, 
  Unlock, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  Shield,
  Key,
  Search,
  Filter
} from 'lucide-react';

interface FieldPermission {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  isSensitive: boolean;
  description: string;
  visible: boolean;
  editable: boolean;
  masked: 'none' | 'partial' | 'full';
  required: boolean;
}

interface ResourceField {
  id: string;
  fieldName: string;
  fieldType: string;
  isSensitive: boolean;
  description: string;
}

interface Resource {
  id: string;
  name: string;
  description: string;
  fields: ResourceField[];
}

interface FieldLevelPermissionEditorProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSave: (permissions: FieldPermission[]) => Promise<void>;
}

const FieldLevelPermissionEditor: React.FC<FieldLevelPermissionEditorProps> = ({
  userId,
  userName,
  onClose,
  onSave
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldPermission>>({});
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSensitive, setFilterSensitive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadResourcesAndPermissions();
  }, [userId]);

  const loadResourcesAndPermissions = async () => {
    try {
      setIsLoading(true);
      
      // Load module structure with fields
      const moduleResponse = await fetch('/api/admin/permissions/modules', {
        credentials: 'include'
      });

      if (!moduleResponse.ok) {
        throw new Error('Failed to load modules');
      }

      const moduleData = await moduleResponse.json();
      const allResources = [...moduleData.modules.mainModules, ...moduleData.modules.subModules];
      setResources(allResources.filter(r => r.fields && r.fields.length > 0));

      // Load existing field permissions for user
      const permissionsResponse = await fetch(`/api/admin/users/${userId}/permissions`, {
        credentials: 'include'
      });

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        
        // Process field-level permissions
        const fieldPerms: Record<string, FieldPermission> = {};
        
        permissionsData.detailed_permissions?.forEach((perm: any) => {
          if (perm.scope_level === 'field' && perm.field_name) {
            const fieldKey = `${perm.resource_name}-${perm.field_name}`;
            
            if (!fieldPerms[fieldKey]) {
              fieldPerms[fieldKey] = {
                fieldId: perm.field_id || '',
                fieldName: perm.field_name,
                fieldType: 'string',
                isSensitive: false,
                description: perm.description || '',
                visible: false,
                editable: false,
                masked: 'none',
                required: false
              };
            }

            // Set permissions based on action and field_mode
            if (perm.action === 'read' && perm.field_mode === 'visible') {
              fieldPerms[fieldKey].visible = perm.is_allow;
            }
            if (perm.action === 'update' && perm.field_mode === 'editable') {
              fieldPerms[fieldKey].editable = perm.is_allow;
            }
            if (perm.field_mode === 'mask') {
              fieldPerms[fieldKey].masked = perm.mask_type || 'partial';
            }
          }
        });

        setFieldPermissions(fieldPerms);
      }

    } catch (error) {
      console.error('Error loading resources and permissions:', error);
      setError('Failed to load field permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFieldPermission = (resourceName: string, fieldName: string, updates: Partial<FieldPermission>) => {
    const fieldKey = `${resourceName}-${fieldName}`;
    
    setFieldPermissions(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        ...updates
      }
    }));
    
    setHasChanges(true);
  };

  const getFieldPermission = (resourceName: string, fieldName: string): FieldPermission => {
    const fieldKey = `${resourceName}-${fieldName}`;
    return fieldPermissions[fieldKey] || {
      fieldId: '',
      fieldName,
      fieldType: 'string',
      isSensitive: false,
      description: '',
      visible: false,
      editable: false,
      masked: 'none',
      required: false
    };
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const permissionsArray = Object.values(fieldPermissions);
      await onSave(permissionsArray);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving field permissions:', error);
      setError('Failed to save field permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredResources = resources.filter(resource => {
    if (selectedResource && resource.id !== selectedResource) {
      return false;
    }
    
    if (searchTerm) {
      const matchesResource = resource.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesField = resource.fields.some(field => 
        field.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!matchesResource && !matchesField) {
        return false;
      }
    }

    return true;
  });

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'string': return '📝';
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '☑️';
      default: return '📄';
    }
  };

  const getMaskIcon = (masked: string) => {
    switch (masked) {
      case 'full': return <EyeOff className="w-4 h-4 text-red-500" />;
      case 'partial': return <Eye className="w-4 h-4 text-yellow-500" />;
      default: return <Eye className="w-4 h-4 text-green-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading field permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Field-Level Permissions
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure granular field access for {userName}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <span className="text-sm text-yellow-600 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search resources or fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Resources</option>
                {resources.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
              
              <select
                value={filterSensitive === null ? 'all' : filterSensitive ? 'sensitive' : 'normal'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterSensitive(value === 'all' ? null : value === 'sensitive');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Fields</option>
                <option value="sensitive">Sensitive Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {filteredResources.map(resource => {
              const fieldsToShow = resource.fields.filter(field => {
                if (filterSensitive !== null && field.isSensitive !== filterSensitive) {
                  return false;
                }
                if (searchTerm) {
                  return field.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.description.toLowerCase().includes(searchTerm.toLowerCase());
                }
                return true;
              });

              if (fieldsToShow.length === 0) return null;

              return (
                <div key={resource.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-800 flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-blue-600" />
                      {resource.name}
                    </h4>
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {fieldsToShow.map(field => {
                      const permission = getFieldPermission(resource.name, field.fieldName);
                      
                      return (
                        <div key={field.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{getFieldIcon(field.fieldType)}</span>
                                <div>
                                  <h5 className="font-medium text-gray-800 flex items-center">
                                    {field.fieldName}
                                    {field.isSensitive && (
                                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                        Sensitive
                                      </span>
                                    )}
                                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                      {field.fieldType}
                                    </span>
                                  </h5>
                                  <p className="text-sm text-gray-600">{field.description}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              {/* Visibility Toggle */}
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Visible:</label>
                                <button
                                  onClick={() => updateFieldPermission(resource.name, field.fieldName, { 
                                    visible: !permission.visible 
                                  })}
                                  className={`p-2 rounded-lg transition-colors ${
                                    permission.visible 
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {permission.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              </div>

                              {/* Editable Toggle */}
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Editable:</label>
                                <button
                                  onClick={() => updateFieldPermission(resource.name, field.fieldName, { 
                                    editable: !permission.editable 
                                  })}
                                  disabled={!permission.visible}
                                  className={`p-2 rounded-lg transition-colors ${
                                    permission.editable && permission.visible
                                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {permission.editable ? <Edit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>
                              </div>

                              {/* Mask Level */}
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Mask:</label>
                                <select
                                  value={permission.masked}
                                  onChange={(e) => updateFieldPermission(resource.name, field.fieldName, { 
                                    masked: e.target.value as 'none' | 'partial' | 'full'
                                  })}
                                  disabled={!permission.visible}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="none">None</option>
                                  <option value="partial">Partial</option>
                                  <option value="full">Full</option>
                                </select>
                                {getMaskIcon(permission.masked)}
                              </div>

                              {/* Required Toggle */}
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Required:</label>
                                <button
                                  onClick={() => updateFieldPermission(resource.name, field.fieldName, { 
                                    required: !permission.required 
                                  })}
                                  disabled={!permission.visible || !permission.editable}
                                  className={`p-2 rounded-lg transition-colors ${
                                    permission.required && permission.visible && permission.editable
                                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Resources Found</h3>
              <p className="text-gray-600">No resources match your current filters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Legend:</span>
              <span className="ml-2">👁️ Visible</span>
              <span className="ml-2">✏️ Editable</span>
              <span className="ml-2">🔒 Read-only</span>
              <span className="ml-2">⚠️ Required</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {Object.keys(fieldPermissions).length} field permissions configured
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldLevelPermissionEditor;
