"use client";
import React, { useMemo } from "react";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

export interface PieDataPoint {
    name: string;
    value: number;
    color?: string;
    [key: string]: any;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        payload: PieDataPoint;
    }>;
    totalSum: number;
}

function CustomTooltip({ active, payload, totalSum }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const value = item.value || 0;
    const percent = totalSum > 0 ? ((value / totalSum) * 100).toFixed(1) : "0";
    const color = item.payload.color || "#a855f7";

    return (
        <div className="bg-[#0b1220]/95 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.5)] min-w-[160px]">
            <div className="flex items-center gap-2 mb-1.5">
                <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: color }}
                />
                <p className="text-xs font-semibold text-zinc-200 truncate max-w-[180px]">
                    {item.name}
                </p>
            </div>
            <div className="flex items-baseline justify-between gap-4">
                <span className="text-base font-bold text-white tracking-tight">
                    {value.toLocaleString()} <span className="text-xs font-normal text-zinc-400">ชิ้น</span>
                </span>
                <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${color}25`, color: color }}
                >
                    {percent}%
                </span>
            </div>
        </div>
    );
}

const DEFAULT_COLORS = [
    "#38bdf8", // Sky blue
    "#a855f7", // Purple
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#f43f5e", // Rose
];

interface ResultPieChartProps {
    data: PieDataPoint[];
    centerLabel?: string;
    centerSublabel?: string;
}

export default function ResultPieChart({
    data,
    centerLabel,
    centerSublabel,
}: ResultPieChartProps) {
    const totalSum = useMemo(() => {
        return (data || []).reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
    }, [data]);

    const coloredData = useMemo(() => {
        return (data || []).map((item, index) => ({
            ...item,
            color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }));
    }, [data]);

    if (!data || data.length === 0 || totalSum === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                <div className="w-14 h-14 rounded-full border border-dashed border-white/10 flex items-center justify-center mb-2">
                    <span className="text-zinc-500 text-sm">0</span>
                </div>
                ไม่มีข้อมูลชิ้นงานในช่วงนี้
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden">
            {/* Donut Chart Visual */}
            <div className="relative w-full h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={coloredData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={76}
                            paddingAngle={coloredData.length > 1 ? 3 : 0}
                            stroke="rgba(11, 10, 19, 0.8)"
                            strokeWidth={2}
                        >
                            {coloredData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={(props: any) => (
                                <CustomTooltip {...props} totalSum={totalSum} />
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Donut Center KPI */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-extrabold text-white tracking-tight">
                        {centerLabel || totalSum.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                        {centerSublabel || "Total"}
                    </span>
                </div>
            </div>

            {/* Legend list with % badges */}
            <div className="flex-1 w-full overflow-y-auto max-h-[125px] pr-1 space-y-1 mt-1 scrollbar-thin scrollbar-thumb-white/15">
                {coloredData.map((item, idx) => {
                    const pct = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : "0";
                    return (
                        <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] transition text-xs border border-white/5"
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-zinc-300 truncate font-medium" title={item.name}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-white font-semibold">
                                    {item.value.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                                    {pct}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}