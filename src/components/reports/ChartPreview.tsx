'use client';

import React, { useMemo } from 'react';
import {
  transformForSingleDimension,
  transformForGroupedDimension,
  transformForPieChart,
  CHART_COLORS,
} from '@/lib/reports';

interface ChartPreviewProps {
  data: Record<string, unknown>[];
  chartType: string;
  primaryDimension?: string;
  secondaryDimension?: string;
  metrics: string[];
  options?: Record<string, unknown>;
}

const ChartPreview: React.FC<ChartPreviewProps> = ({
  data,
  chartType,
  primaryDimension,
  secondaryDimension,
  metrics,
  options = {},
}) => {
  // Transform data for charts
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || metrics.length === 0) return null;
    
    if (chartType === 'pie' || chartType === 'donut') {
      if (primaryDimension) {
        return transformForPieChart(data, primaryDimension, metrics[0]);
      }
    }
    
    if (chartType === 'grouped_bar' || chartType === 'stacked_bar' || chartType === 'multi_line') {
      if (primaryDimension && secondaryDimension) {
        return transformForGroupedDimension(data, primaryDimension, secondaryDimension, metrics[0]);
      }
    }
    
    if (primaryDimension) {
      return transformForSingleDimension(data, primaryDimension, metrics);
    }
    
    return null;
  }, [data, chartType, primaryDimension, secondaryDimension, metrics]);
  
  if (!chartData) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No data to display
      </div>
    );
  }
  
  // Render KPI cards
  if (chartType === 'kpi_cards') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const total = data.reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);
          return (
            <div
              key={metric}
              className="bg-gray-50 rounded-xl p-6 text-center"
              style={{ borderTop: `4px solid ${CHART_COLORS[index % CHART_COLORS.length]}` }}
            >
              <div className="text-3xl font-bold text-gray-900">
                {total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {metric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Render pie/donut chart
  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <PieChartSVG
        data={chartData}
        donut={chartType === 'donut'}
        showValues={options.showValues as boolean}
        showLegend={options.showLegend as boolean}
      />
    );
  }
  
  // Render bar charts
  if (['bar', 'horizontal_bar', 'grouped_bar', 'stacked_bar'].includes(chartType)) {
    return (
      <BarChartSVG
        data={chartData}
        horizontal={chartType === 'horizontal_bar'}
        stacked={chartType === 'stacked_bar'}
        showValues={options.showValues as boolean}
        showLegend={options.showLegend as boolean}
      />
    );
  }
  
  // Render line/area charts
  if (['line', 'multi_line', 'area', 'stacked_area'].includes(chartType)) {
    return (
      <LineChartSVG
        data={chartData}
        area={chartType === 'area' || chartType === 'stacked_area'}
        showValues={options.showValues as boolean}
        showLegend={options.showLegend as boolean}
      />
    );
  }
  
  return (
    <div className="h-[400px] flex items-center justify-center text-gray-400">
      Chart type not supported
    </div>
  );
};

// ============================================================================
// BAR CHART COMPONENT
// ============================================================================

interface BarChartSVGProps {
  data: { labels: string[]; datasets: { label: string; data: number[]; backgroundColor?: string | string[] }[] };
  horizontal?: boolean;
  stacked?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
}

const BarChartSVG: React.FC<BarChartSVGProps> = ({
  data,
  horizontal = false,
  stacked = false,
  showValues = false,
  showLegend = true,
}) => {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Calculate max value
  let maxValue = 0;
  if (stacked) {
    data.labels.forEach((_, i) => {
      const sum = data.datasets.reduce((acc, ds) => acc + (ds.data[i] || 0), 0);
      maxValue = Math.max(maxValue, sum);
    });
  } else {
    data.datasets.forEach(ds => {
      maxValue = Math.max(maxValue, ...ds.data);
    });
  }
  
  // Add padding to max value
  maxValue = maxValue * 1.1;
  
  const numBars = data.labels.length;
  const numDatasets = data.datasets.length;
  const groupWidth = chartWidth / numBars;
  const barWidth = stacked 
    ? groupWidth * 0.7 
    : (groupWidth * 0.7) / numDatasets;
  const barGap = stacked ? 0 : barWidth * 0.1;
  
  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxValue / yTicks) * i);
  
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y-axis */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {yTickValues.map((val, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={chartHeight - (val / maxValue) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (val / maxValue) * chartHeight}
                stroke="#e5e7eb"
                strokeDasharray="4,4"
              />
              <text
                x={-10}
                y={chartHeight - (val / maxValue) * chartHeight + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}
          
          {/* Bars */}
          {data.labels.map((label, labelIndex) => {
            const groupX = labelIndex * groupWidth + groupWidth * 0.15;
            let stackY = chartHeight;
            
            return (
              <g key={labelIndex}>
                {data.datasets.map((dataset, dsIndex) => {
                  const value = dataset.data[labelIndex] || 0;
                  const barHeight = (value / maxValue) * chartHeight;
                  
                  let x, y;
                  if (stacked) {
                    x = groupX;
                    stackY -= barHeight;
                    y = stackY;
                  } else {
                    x = groupX + dsIndex * (barWidth + barGap);
                    y = chartHeight - barHeight;
                  }
                  
                  return (
                    <g key={dsIndex}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[dsIndex % dataset.backgroundColor.length] : (dataset.backgroundColor || CHART_COLORS[dsIndex % CHART_COLORS.length])}
                        rx={2}
                        className="transition-opacity hover:opacity-80"
                      />
                      {showValues && barHeight > 15 && (
                        <text
                          x={x + barWidth / 2}
                          y={y + 14}
                          textAnchor="middle"
                          className="text-[10px] fill-white font-medium"
                        >
                          {value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* X-axis label */}
                <text
                  x={groupX + (stacked ? barWidth / 2 : (numDatasets * barWidth) / 2)}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  transform={`rotate(-45, ${groupX + (stacked ? barWidth / 2 : (numDatasets * barWidth) / 2)}, ${chartHeight + 20})`}
                  className="text-xs fill-gray-600"
                >
                  {label.length > 12 ? label.substring(0, 12) + '...' : label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Legend */}
      {showLegend && data.datasets.length > 1 && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : (ds.backgroundColor || CHART_COLORS[i % CHART_COLORS.length]) }}
              />
              <span className="text-sm text-gray-600">{ds.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LINE CHART COMPONENT
// ============================================================================

interface LineChartSVGProps {
  data: { labels: string[]; datasets: { label: string; data: number[]; borderColor?: string | string[] }[] };
  area?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
}

const LineChartSVG: React.FC<LineChartSVGProps> = ({
  data,
  area = false,
  showValues = false,
  showLegend = true,
}) => {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Calculate max value
  const maxValue = Math.max(...data.datasets.flatMap(ds => ds.data)) * 1.1;
  
  // Generate points for each dataset
  const pointsPerDataset = data.datasets.map(dataset => {
    return dataset.data.map((value, i) => ({
      x: (i / (data.labels.length - 1)) * chartWidth,
      y: chartHeight - (value / maxValue) * chartHeight,
      value,
    }));
  });
  
  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxValue / yTicks) * i);
  
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {yTickValues.map((val, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={chartHeight - (val / maxValue) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (val / maxValue) * chartHeight}
                stroke="#e5e7eb"
                strokeDasharray="4,4"
              />
              <text
                x={-10}
                y={chartHeight - (val / maxValue) * chartHeight + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}
          
          {/* Lines/Areas */}
          {pointsPerDataset.map((points, dsIndex) => {
            const borderColor = data.datasets[dsIndex].borderColor;
            const color = Array.isArray(borderColor) ? borderColor[dsIndex % borderColor.length] : (borderColor || CHART_COLORS[dsIndex % CHART_COLORS.length]);
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            
            return (
              <g key={dsIndex}>
                {/* Area fill */}
                {area && (
                  <path
                    d={`${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`}
                    fill={color}
                    fillOpacity={0.2}
                  />
                )}
                
                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Points */}
                {points.map((point, i) => (
                  <g key={i}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={4}
                      fill="white"
                      stroke={color}
                      strokeWidth={2}
                    />
                    {showValues && (
                      <text
                        x={point.x}
                        y={point.y - 10}
                        textAnchor="middle"
                        className="text-[10px] fill-gray-600"
                      >
                        {point.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.labels.map((label, i) => (
            <text
              key={i}
              x={(i / (data.labels.length - 1)) * chartWidth}
              y={chartHeight + 20}
              textAnchor="middle"
              transform={`rotate(-45, ${(i / (data.labels.length - 1)) * chartWidth}, ${chartHeight + 20})`}
              className="text-xs fill-gray-600"
            >
              {label.length > 12 ? label.substring(0, 12) + '...' : label}
            </text>
          ))}
        </g>
      </svg>
      
      {/* Legend */}
      {showLegend && data.datasets.length > 1 && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: Array.isArray(ds.borderColor) ? ds.borderColor[0] : (ds.borderColor || CHART_COLORS[i % CHART_COLORS.length]) }}
              />
              <span className="text-sm text-gray-600">{ds.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PIE CHART COMPONENT
// ============================================================================

interface PieChartSVGProps {
  data: { labels: string[]; datasets: { data: number[]; backgroundColor?: string | string[] }[] };
  donut?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
}

const PieChartSVG: React.FC<PieChartSVGProps> = ({
  data,
  donut = false,
  showValues = false,
  showLegend = true,
}) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  const innerRadius = donut ? radius * 0.6 : 0;
  
  const dataset = data.datasets[0];
  const total = dataset.data.reduce((sum, val) => sum + val, 0);
  
  // Generate pie slices
  let currentAngle = -Math.PI / 2;
  const slices = dataset.data.map((value, i) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    
    const midAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.7;
    
    // Handle backgroundColor being either string or string[]
    const bgColor = dataset.backgroundColor;
    const sliceColor = Array.isArray(bgColor) 
      ? (bgColor[i] || CHART_COLORS[i % CHART_COLORS.length])
      : (bgColor || CHART_COLORS[i % CHART_COLORS.length]);
    
    return {
      value,
      percentage: (value / total) * 100,
      label: data.labels[i],
      color: sliceColor,
      startAngle,
      endAngle,
      labelX: center + Math.cos(midAngle) * labelRadius,
      labelY: center + Math.sin(midAngle) * labelRadius,
    };
  });
  
  // Generate SVG arc path
  const arcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const startX1 = center + Math.cos(startAngle) * outerR;
    const startY1 = center + Math.sin(startAngle) * outerR;
    const endX1 = center + Math.cos(endAngle) * outerR;
    const endY1 = center + Math.sin(endAngle) * outerR;
    const startX2 = center + Math.cos(endAngle) * innerR;
    const startY2 = center + Math.sin(endAngle) * innerR;
    const endX2 = center + Math.cos(startAngle) * innerR;
    const endY2 = center + Math.sin(startAngle) * innerR;
    
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    
    if (innerR === 0) {
      return `M ${center} ${center} L ${startX1} ${startY1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${endX1} ${endY1} Z`;
    }
    
    return `M ${startX1} ${startY1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${endX1} ${endY1} L ${startX2} ${startY2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${endX2} ${endY2} Z`;
  };
  
  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[300px] h-[300px]">
        {slices.map((slice, i) => (
          <g key={i}>
            <path
              d={arcPath(slice.startAngle, slice.endAngle, innerRadius, radius)}
              fill={slice.color}
              className="transition-opacity hover:opacity-80"
            />
            {showValues && slice.percentage > 5 && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-white font-medium"
              >
                {slice.percentage.toFixed(0)}%
              </text>
            )}
          </g>
        ))}
        
        {/* Center total for donut */}
        {donut && (
          <g>
            <text
              x={center}
              y={center - 8}
              textAnchor="middle"
              className="text-2xl fill-gray-900 font-bold"
            >
              {total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </text>
            <text
              x={center}
              y={center + 12}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              Total
            </text>
          </g>
        )}
      </svg>
      
      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm text-gray-600">
                {slice.label} ({slice.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartPreview;

