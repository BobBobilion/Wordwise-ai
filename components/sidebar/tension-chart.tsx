"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PlotPoint {
  point: string
  tension: number
}

interface TensionChartProps {
  plotSummary: PlotPoint[]
  onPointClick: (index: number) => void
  selectedPoint: number | null
}

interface ChartDataPoint {
  index: number
  tension: number
  point: string
}

// Function to convert markdown to HTML safely (same as in plot-summary.tsx)
function markdownToHtml(text: string): string {
  let result = text
  
  // First pass: Convert **bold** to <strong> tags
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Second pass: Convert *italic* to <em> tags
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // Convert `code` to <code> tags
  result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
  
  // Convert line breaks to <br> tags
  result = result.replace(/\n/g, '<br>')
  
  return result
}

// Function to safely render HTML content
function createMarkup(htmlContent: string) {
  return { __html: htmlContent }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint
    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
        style={{ 
          transform: 'translateY(-100%) translateY(-10px)',
          marginBottom: '10px'
        }}
      >
        <div 
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={createMarkup(markdownToHtml(data.point))}
        />
      </div>
    )
  }
  return null
}

const CustomDot = ({ cx, cy, payload, index, onClick, selectedPoint }: any) => {
  const isSelected = selectedPoint === index
  
  return (
    <g>
      {/* Background circle for better clickability */}
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill="transparent"
        onClick={() => onClick(index)}
        style={{ cursor: 'pointer' }}
      />
      {/* Main circle */}
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={isSelected ? "#3b82f6" : "#ffffff"}
        stroke={isSelected ? "#1d4ed8" : "#3b82f6"}
        strokeWidth={isSelected ? 3 : 2}
        onClick={() => onClick(index)}
        style={{ cursor: 'pointer' }}
      />
      {/* Number inside circle */}
      <text
        x={cx}
        y={cy}
        dy={3}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill={isSelected ? "#ffffff" : "#3b82f6"}
        onClick={() => onClick(index)}
        style={{ cursor: 'pointer', pointerEvents: 'none' }}
      >
        {index + 1}
      </text>
    </g>
  )
}

export function TensionChart({ plotSummary, onPointClick, selectedPoint }: TensionChartProps) {
  const [isHovering, setIsHovering] = useState(false)
  
  // Transform data for the chart
  const chartData: ChartDataPoint[] = plotSummary.map((item, index) => ({
    index: index + 1,
    tension: item.tension,
    point: item.point
  }))

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900">Plot Tension Over Time</h4>
        <p className="text-xs text-gray-500">Hover to see plot points • Click to highlight corresponding elements</p>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="index" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              hide
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="tension"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={isHovering ? (props) => {
                const { key, ...dotProps } = props
                return (
                  <CustomDot 
                    key={key}
                    {...dotProps} 
                    onClick={onPointClick}
                    selectedPoint={selectedPoint}
                  />
                )
              } : false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 