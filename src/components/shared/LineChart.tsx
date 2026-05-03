"use client";

/**
 * LineChart — Pure SVG line chart, zero dependencies
 *
 * Features:
 *  - Smooth cubic bezier curves
 *  - Gradient fill under line
 *  - Animated draw-on-mount
 *  - Hover tooltip via SVG foreignObject
 *  - Responsive via viewBox
 *
 * Usage:
 *   <LineChart
 *     data={[{ label: "Mon", value: 12 }, ...]}
 *     color="orange"
 *     height={160}
 *   />
 */

import { useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChartPoint {
    label: string;
    value: number;
}

interface LineChartProps {
    data: ChartPoint[];
    color?: string;          // CSS color string e.g. "#f97316" or "var(--brand-500)"
    height?: number;
    showDots?: boolean;
    showGrid?: boolean;
    showArea?: boolean;
    formatValue?: (v: number) => string;
    className?: string;
    animated?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function smooth(points: [number, number][]): string {
    if (points.length < 2) return points.map(([x, y]) => `${x},${y}`).join(" ");

    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const cpx = (x0 + x1) / 2;
        d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
    }
    return d;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PAD = { top: 16, right: 16, bottom: 32, left: 44 };

export default function LineChart({
    data,
    color = "#f97316",
    height = 180,
    showDots = true,
    showGrid = true,
    showArea = true,
    formatValue = (v) => v.toLocaleString("en-IN"),
    className = "",
    animated = true,
}: LineChartProps) {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; point: ChartPoint } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const WIDTH = 600; // viewBox width (responsive)
    const HEIGHT = height;
    const chartW = WIDTH - PAD.left - PAD.right;
    const chartH = HEIGHT - PAD.top - PAD.bottom;

    const { points, minV, maxV, yTicks } = useMemo(() => {
        if (!data.length) return { points: [], minV: 0, maxV: 1, yTicks: [] };
        const values = data.map((d) => d.value);
        const minV = Math.min(...values);
        const maxV = Math.max(...values);
        const range = maxV - minV || 1;
        const pad = range * 0.15;
        const lo = Math.max(0, minV - pad);
        const hi = maxV + pad;

        const pts: [number, number][] = data.map((d, i) => {
            const x = PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
            const y = PAD.top + chartH - ((d.value - lo) / (hi - lo)) * chartH;
            return [x, y];
        });

        // Y-axis ticks (4 evenly spaced)
        const tickCount = 4;
        const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
            const val = lo + ((hi - lo) * i) / tickCount;
            const y = PAD.top + chartH - (i / tickCount) * chartH;
            return { val, y };
        });

        return { points: pts, minV: lo, maxV: hi, yTicks };
    }, [data, chartW, chartH]);

    if (!data.length) {
        return (
            <div className={`flex items-center justify-center text-muted-foreground text-sm ${className}`} style={{ height }}>
                No data yet
            </div>
        );
    }

    const linePath = smooth(points);
    const areaPath = `${linePath} L ${points[points.length - 1][0]},${PAD.top + chartH} L ${points[0][0]},${PAD.top + chartH} Z`;
    const gradId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

    return (
        <div className={`relative select-none ${className}`} style={{ height }}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setTooltip(null)}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                    {animated && (
                        <style>{`
                            @keyframes drawLine { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
                            .chart-line { stroke-dasharray: 2000; animation: drawLine 1.2s ease forwards; }
                        `}</style>
                    )}
                </defs>

                {/* Grid lines */}
                {showGrid && yTicks.map((t, i) => (
                    <g key={i}>
                        <line
                            x1={PAD.left} y1={t.y}
                            x2={PAD.left + chartW} y2={t.y}
                            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
                        />
                        <text
                            x={PAD.left - 6} y={t.y + 4}
                            textAnchor="end"
                            className="fill-current text-muted-foreground"
                            fontSize={10}
                            opacity={0.6}
                        >
                            {formatValue(t.val)}
                        </text>
                    </g>
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text
                        key={i}
                        x={points[i]?.[0] ?? 0}
                        y={PAD.top + chartH + 18}
                        textAnchor="middle"
                        fontSize={9}
                        opacity={0.55}
                        className="fill-current text-muted-foreground"
                    >
                        {d.label}
                    </text>
                ))}

                {/* Area fill */}
                {showArea && (
                    <path d={areaPath} fill={`url(#${gradId})`} />
                )}

                {/* Line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={animated ? "chart-line" : ""}
                />

                {/* Dots + hover targets */}
                {showDots && points.map(([x, y], i) => (
                    <g key={i}>
                        {/* Invisible fat hit area */}
                        <circle
                            cx={x} cy={y} r={14}
                            fill="transparent"
                            onMouseEnter={() => setTooltip({ x, y, point: data[i] })}
                        />
                        {/* Visible dot */}
                        <circle
                            cx={x} cy={y} r={3.5}
                            fill={color}
                            stroke="white"
                            strokeWidth={1.5}
                            className="pointer-events-none"
                            opacity={tooltip?.point === data[i] ? 1 : 0.7}
                        />
                        {/* Active ring */}
                        {tooltip?.point === data[i] && (
                            <circle
                                cx={x} cy={y} r={7}
                                fill={color}
                                opacity={0.15}
                                className="pointer-events-none"
                            />
                        )}
                    </g>
                ))}
            </svg>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs"
                    style={{
                        left: `${(tooltip.x / WIDTH) * 100}%`,
                        top: `${(tooltip.y / HEIGHT) * 100}%`,
                        transform: "translate(-50%, -110%)",
                    }}
                >
                    <p className="font-semibold text-foreground">{formatValue(tooltip.point.value)}</p>
                    <p className="text-muted-foreground mt-0.5">{tooltip.point.label}</p>
                </div>
            )}
        </div>
    );
}
