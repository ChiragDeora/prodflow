import React, { useState } from 'react';
import { Zap, Thermometer, Droplet, History, X, Upload, AlertCircle, ArrowLeft } from 'lucide-react';

interface DailyReadingsTabProps {
  defaultUnit: string;
}

const DailyReadingsTab: React.FC<DailyReadingsTabProps> = ({ defaultUnit }) => {
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState<any>({
    power: {},
    moldTemp: {},
    tdsWater: {}
  });

  const handlePhotoUpload = () => {
    alert('⚠️ Google Drive not connected yet');
  };

  const handleFormSubmit = (type: string) => {
    console.log(`Submitting ${type} form:`, formData[type]);
    // TODO: Implement API call to save readings
    setActiveForm(null);
  };

  const handleFormClose = () => {
    setActiveForm(null);
  };

  const cards = [
    {
      id: 'power',
      title: 'Daily Power Readings',
      icon: Zap,
      color: 'bg-yellow-500',
      description: 'Record daily power consumption readings'
    },
    {
      id: 'moldTemp',
      title: 'Mold Temp Readings',
      icon: Thermometer,
      color: 'bg-red-500',
      description: 'Record mold temperature readings'
    },
    {
      id: 'tdsWater',
      title: 'TDS Water Readings',
      icon: Droplet,
      color: 'bg-blue-500',
      description: 'Record TDS water quality readings'
    },
    {
      id: 'history',
      title: 'History',
      icon: History,
      color: 'bg-gray-500',
      description: 'View historical readings'
    }
  ];

  const renderPowerForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
        <input
          type="date"
          value={formData.power.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            power: { ...prev.power, date: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
        <input
          type="text"
          value={defaultUnit}
          disabled
          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Power Reading (kWh) *</label>
        <input
          type="number"
          step="0.01"
          value={formData.power.reading || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            power: { ...prev.power, reading: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter power reading"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
        <input
          type="time"
          value={formData.power.time || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            power: { ...prev.power, time: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={formData.power.notes || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            power: { ...prev.power, notes: e.target.value }
          }))}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Additional notes"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo Upload</label>
        <button
          type="button"
          onClick={handlePhotoUpload}
          className="w-full border-2 border-dashed border-gray-300 rounded-md px-4 py-6 flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Click to upload photo</span>
        </button>
      </div>
    </div>
  );

  const renderMoldTempForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
        <input
          type="date"
          value={formData.moldTemp.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            moldTemp: { ...prev.moldTemp, date: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
        <input
          type="text"
          value={defaultUnit}
          disabled
          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mold ID</label>
        <input
          type="text"
          value={formData.moldTemp.moldId || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            moldTemp: { ...prev.moldTemp, moldId: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter mold ID"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C) *</label>
        <input
          type="number"
          step="0.1"
          value={formData.moldTemp.temperature || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            moldTemp: { ...prev.moldTemp, temperature: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter temperature"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
        <input
          type="time"
          value={formData.moldTemp.time || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            moldTemp: { ...prev.moldTemp, time: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={formData.moldTemp.notes || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            moldTemp: { ...prev.moldTemp, notes: e.target.value }
          }))}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Additional notes"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo Upload</label>
        <button
          type="button"
          onClick={handlePhotoUpload}
          className="w-full border-2 border-dashed border-gray-300 rounded-md px-4 py-6 flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Click to upload photo</span>
        </button>
      </div>
    </div>
  );

  const renderTDSWaterForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
        <input
          type="date"
          value={formData.tdsWater.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            tdsWater: { ...prev.tdsWater, date: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
        <input
          type="text"
          value={defaultUnit}
          disabled
          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">TDS Reading (ppm) *</label>
        <input
          type="number"
          step="0.1"
          value={formData.tdsWater.tdsReading || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            tdsWater: { ...prev.tdsWater, tdsReading: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter TDS reading"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">pH Level</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="14"
          value={formData.tdsWater.phLevel || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            tdsWater: { ...prev.tdsWater, phLevel: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter pH level"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
        <input
          type="time"
          value={formData.tdsWater.time || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            tdsWater: { ...prev.tdsWater, time: e.target.value }
          }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={formData.tdsWater.notes || ''}
                    onChange={(e) => setFormData((prev: any) => ({
            ...prev,
            tdsWater: { ...prev.tdsWater, notes: e.target.value }
          }))}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Additional notes"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo Upload</label>
        <button
          type="button"
          onClick={handlePhotoUpload}
          className="w-full border-2 border-dashed border-gray-300 rounded-md px-4 py-6 flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Click to upload photo</span>
        </button>
      </div>
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reading History</h3>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reading Type</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="all">All Types</option>
              <option value="power">Power Readings</option>
              <option value="moldTemp">Mold Temperature</option>
              <option value="tdsWater">TDS Water</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Filter
            </button>
          </div>
        </div>

        {/* History Table Placeholder */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Historical readings will be displayed here</p>
          <p className="text-sm text-gray-400">This feature will show all past readings from Power, Mold Temperature, and TDS Water readings</p>
        </div>
      </div>
    </div>
  );

  const getFormTitle = () => {
    switch (activeForm) {
      case 'power': return 'Daily Power Readings';
      case 'moldTemp': return 'Mold Temp Readings';
      case 'tdsWater': return 'TDS Water Readings';
      default: return '';
    }
  };

  const renderFormContent = () => {
    switch (activeForm) {
      case 'power': return renderPowerForm();
      case 'moldTemp': return renderMoldTempForm();
      case 'tdsWater': return renderTDSWaterForm();
      default: return null;
    }
  };

  return (
    <div className="p-6">
      {!showHistory ? (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Daily Readings</h2>
            <p className="text-gray-600 mt-1">Record and manage daily readings</p>
          </div>

          {/* Grid Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card) => {
              const IconComponent = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    if (card.id === 'history') {
                      setShowHistory(true);
                    } else {
                      setActiveForm(card.id);
                    }
                  }}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Readings
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Reading History</h2>
            <p className="text-gray-600 mt-1">View all historical readings</p>
          </div>
          {renderHistoryView()}
        </>
      )}

      {/* Form Modal */}
      {activeForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-300 w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{getFormTitle()}</h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {renderFormContent()}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleFormClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFormSubmit(activeForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReadingsTab;

