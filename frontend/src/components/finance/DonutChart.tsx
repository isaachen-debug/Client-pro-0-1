import React from 'react';

interface DonutChartData {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    data: DonutChartData[];
    size?: number;
    strokeWidth?: number;
    isDark?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({
    data,
    size = 160,
    strokeWidth = 20,
    isDark = false,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    const total = data.reduce((sum, item) => sum + item.value, 0);

    let currentAngle = -90; // Start from top

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Chart */}
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={isDark ? '#1e293b' : '#f1f5f9'}
                    strokeWidth={strokeWidth}
                />

                {/* Data segments */}
                {data.map((item, index) => {
                    const percentage = item.value / total;
                    const strokeLength = circumference * percentage;
                    const strokeDasharray = `${strokeLength} ${circumference}`;
                    const rotation = currentAngle;

                    currentAngle += percentage * 360;

                    return (
                        <circle
                            key={index}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeLinecap="round"
                            style={{
                                transformOrigin: `${center}px ${center}px`,
                                transform: `rotate(${rotation}deg)`,
                            }}
                            className="transition-all duration-300"
                        />
                    );
                })}

                {/* Center label */}
                <text
                    x={center}
                    y={center}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-2xl font-black ${isDark ? 'fill-white' : 'fill-slate-900'}`}
                    style={{ transform: 'rotate(90deg)', transformOrigin: `${center}px ${center}px` }}
                >
                    {total}
                </text>
            </svg>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 w-full">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.label}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                {((item.value / total) * 100).toFixed(0)}%
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DonutChart;
