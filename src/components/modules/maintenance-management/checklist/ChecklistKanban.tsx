import React, { useState, useEffect } from 'react';
import { Plus, User, Calendar, Clock, CheckCircle, AlertTriangle, MoreVertical, Filter, Search } from 'lucide-react';
import ChecklistForm from './ChecklistForm';
import DailyChecklistSections from './DailyChecklistSections';

interface ChecklistItem {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  dueDate: string;
  createdDate: string;
  completedDate?: string;
  sections: number;
  completedSections: number;
  tags: string[];
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  items: ChecklistItem[];
}

const ChecklistKanban: React.FC = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistItem | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [draggedItem, setDraggedItem] = useState<ChecklistItem | null>(null);
  const [showDailySections, setShowDailySections] = useState(false);

  // Initialize Kanban columns
  useEffect(() => {
    const initialColumns: KanbanColumn[] = [
      {
        id: 'pending',
        title: 'Pending',
        color: 'bg-yellow-50 border-yellow-200',
        items: []
      },
      {
        id: 'in_progress',
        title: 'In Progress',
        color: 'bg-blue-50 border-blue-200',
        items: []
      },
      {
        id: 'completed',
        title: 'Completed',
        color: 'bg-green-50 border-green-200',
        items: []
      },
      {
        id: 'overdue',
        title: 'Overdue',
        color: 'bg-red-50 border-red-200',
        items: []
      }
    ];

    // Mock data for demonstration
    const mockChecklists: ChecklistItem[] = [
      {
        id: '1',
        type: 'Daily Check List',
        title: 'Daily Equipment Inspection',
        description: 'Daily inspection checklist for all equipment',
        status: 'completed',
        priority: 'high',
        assignedTo: 'John Smith',
        dueDate: '2024-01-15',
        createdDate: '2024-01-15',
        completedDate: '2024-01-15',
        sections: 7,
        completedSections: 7,
        tags: ['Daily', 'Equipment']
      },
      {
        id: '2',
        type: 'Weekly Compressor Check Sheet',
        title: 'Weekly Compressor Maintenance',
        description: 'Weekly compressor maintenance and inspection',
        status: 'in_progress',
        priority: 'medium',
        assignedTo: 'Mike Johnson',
        dueDate: '2024-01-20',
        createdDate: '2024-01-14',
        sections: 6,
        completedSections: 4,
        tags: ['Weekly', 'Compressor']
      },
      {
        id: '3',
        type: 'Monthly Robot Check List',
        title: 'Monthly Robot Inspection',
        description: 'Monthly robot system comprehensive inspection',
        status: 'pending',
        priority: 'high',
        assignedTo: 'Sarah Wilson',
        dueDate: '2024-01-25',
        createdDate: '2024-01-10',
        sections: 6,
        completedSections: 0,
        tags: ['Monthly', 'Robot']
      },
      {
        id: '4',
        type: 'Quarterly Machine Check List',
        title: 'Q1 Machine Assessment',
        description: 'Quarterly comprehensive machine assessment',
        status: 'overdue',
        priority: 'critical',
        assignedTo: 'David Brown',
        dueDate: '2024-01-10',
        createdDate: '2024-01-01',
        sections: 6,
        completedSections: 2,
        tags: ['Quarterly', 'Machine']
      },
      {
        id: '5',
        type: 'Annual Machine Check List',
        title: 'Annual Machine Review',
        description: 'Annual comprehensive machine inspection',
        status: 'pending',
        priority: 'critical',
        assignedTo: 'Lisa Chen',
        dueDate: '2024-02-15',
        createdDate: '2024-01-05',
        sections: 6,
        completedSections: 0,
        tags: ['Annual', 'Machine']
      }
    ];

    // Distribute items to columns
    const updatedColumns = initialColumns.map(column => ({
      ...column,
      items: mockChecklists.filter(item => item.status === column.id)
    }));

    setColumns(updatedColumns);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const handleDragStart = (e: React.DragEvent, item: ChecklistItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newStatus = columnId as 'pending' | 'in_progress' | 'completed' | 'overdue';
    
    setColumns(prev => prev.map(column => ({
      ...column,
      items: column.items.filter(item => item.id !== draggedItem.id)
    })));

    setColumns(prev => prev.map(column => {
      if (column.id === columnId) {
        return {
          ...column,
          items: [...column.items, { ...draggedItem, status: newStatus }]
        };
      }
      return column;
    }));

    setDraggedItem(null);
  };

  const handleOpenChecklist = (checklist: ChecklistItem) => {
    // Special handling for Daily Check List - show sections view
    if (checklist.type === 'Daily Check List') {
      setShowDailySections(true);
    } else {
      setSelectedChecklist(checklist);
      setShowFormModal(true);
    }
  };

  const handleDailySectionClick = (sectionId: string) => {
    // Create a mock checklist record for the specific section
    const sectionChecklist: ChecklistItem = {
      id: `daily-${sectionId}`,
      type: `Daily Check List - ${sectionId.replace('daily-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      title: `Daily Check List - ${sectionId.replace('daily-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      description: `Daily ${sectionId.replace('daily-', '').replace(/-/g, ' ')} inspection`,
      status: 'pending',
      priority: 'high',
      assignedTo: 'Current User',
      dueDate: new Date().toISOString().split('T')[0],
      createdDate: new Date().toISOString().split('T')[0],
      sections: 1,
      completedSections: 0,
      tags: ['Daily', sectionId.replace('daily-', '').replace(/-/g, ' ')]
    };
    setSelectedChecklist(sectionChecklist);
    setSelectedType(sectionId);
    setShowFormModal(true);
  };

  const handleCreateNew = () => {
    setSelectedChecklist(null);
    setSelectedType('daily');
    setShowFormModal(true);
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    items: column.items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAssignee = filterAssignee === 'all' || item.assignedTo === filterAssignee;
      const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
      
      return matchesSearch && matchesAssignee && matchesPriority;
    })
  }));

  const allAssignees = Array.from(new Set(columns.flatMap(col => col.items.map(item => item.assignedTo))));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {/* <div className="bg-white border-b border-gray-200 p-6"> */}
        {/* <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maintenance Checklists</h1>
            <p className="text-gray-600">Kanban view for managing maintenance checklists</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Checklist
          </button>
        </div> */}

        {/* Filters */}
        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search checklists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div> */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Assignees</option>
              {allAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div> */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div> */}
          {/* <div className="flex items-end">
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center">
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div> */}
      {/* </div> */}

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex space-x-6 h-full">
          {filteredColumns.map((column) => (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 ${column.color} border rounded-lg p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                  {column.items.length}
                </span>
              </div>

              {/* Column Items */}
              <div className="space-y-3">
                {column.items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => handleOpenChecklist(item)}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm font-medium text-gray-900">{item.type}</span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item Title */}
                    <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Priority Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(item.priority)}`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs text-gray-500">
                          {item.completedSections} of {item.sections}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(item.completedSections, item.sections)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{item.assignedTo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedChecklist ? selectedChecklist.type : 'New Checklist'}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedChecklist ? `Date: ${selectedChecklist.createdDate}` : 'Fill out the checklist below'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  setSelectedChecklist(null);
                  setSelectedType('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ChecklistForm
                checklistType={selectedChecklist ? 
                  selectedChecklist.type === 'Daily Check List' ? 'daily' :
                  selectedChecklist.type === 'Weekly Compressor Check Sheet' ? 'weekly-compressor' :
                  selectedChecklist.type === 'Weekly Magnate Check Sheet' ? 'weekly-magnate' :
                  selectedChecklist.type === 'Monthly Robot Check List' ? 'monthly-robot' :
                  selectedChecklist.type === 'Monthly Machine Check List' ? 'monthly-machine' :
                  selectedChecklist.type === 'Quarterly Machine Check List' ? 'quarterly-machine' :
                  selectedChecklist.type === 'Semi Annual Machine Check List' ? 'semi-annual-machine' :
                  selectedChecklist.type === 'Annual Machine Check List' ? 'annual-machine' :
                  selectedChecklist.type === 'PM Plan for 2022(SEP.)' ? 'pm-plan' : 'daily'
                  : selectedType}
                checklistData={selectedChecklist}
                onSave={(data) => {
                  console.log('Checklist saved:', data);
                  setShowFormModal(false);
                  setSelectedChecklist(null);
                  setSelectedType('');
                }}
                onClose={() => {
                  setShowFormModal(false);
                  setSelectedChecklist(null);
                  setSelectedType('');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Daily Sections Modal */}
      {showDailySections && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Daily Check List</h2>
                <p className="text-sm text-gray-600">Select a section to complete the daily checklist</p>
              </div>
              <button
                onClick={() => setShowDailySections(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <DailyChecklistSections
                onSectionClick={handleDailySectionClick}
                onBack={() => setShowDailySections(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistKanban;
