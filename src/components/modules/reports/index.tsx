'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';

const ReportsModule: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Production Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Production Overview</h3>
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-center text-gray-500 py-8">
            <p>Coming Soon</p>
            <p className="text-sm">Production metrics and charts</p>
          </div>
        </div>

        {/* Efficiency Reports */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Efficiency Reports</h3>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-center text-gray-500 py-8">
            <p>Coming Soon</p>
            <p className="text-sm">Machine efficiency analytics</p>
          </div>
        </div>

        {/* Operator Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Operator Performance</h3>
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-center text-gray-500 py-8">
            <p>Coming Soon</p>
            <p className="text-sm">Operator productivity metrics</p>
          </div>
        </div>

        {/* Time Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Time Analysis</h3>
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-center text-gray-500 py-8">
            <p>Coming Soon</p>
            <p className="text-sm">Downtime and cycle time analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;