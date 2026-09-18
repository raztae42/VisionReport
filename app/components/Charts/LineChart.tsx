"use client";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';


interface DataPoint {
    name: string;
    Good?: number;
    NG?: number;
    Passed?: number;
    Reject?: number;
    [key: string]: any;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        dataKey: string;
    }>;
    label?: string;
}

const Chart_colors: Record<string, string> = {
    Good: '#10b981',
    Passed: '#10b981',
    NG: '#f43f5e',
    Reject: '#f43f5e',
}
// Custom Tooltip สวยๆ
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload) return null;
    return (
        <div style={{
            background: 'rgba(11, 30, 73, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
            <p style={{ color: '#d2d2d2ff', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>
                {label}
            </p>
            {payload.map((entry, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: Chart_colors[entry.dataKey] || '#fff', display: 'inline-block',
                    }} />
                    <span style={{ color: Chart_colors[entry.dataKey] || '#fff', fontSize: '13px' }}>
                        {entry.name}:
                    </span>

                    <span style={{ color: Chart_colors[entry.dataKey] || '#fff', fontSize: '13px', fontWeight: 700 }}>
                        {entry.value.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function ResultChart({ data }: { data: DataPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                    <linearGradient id="passedGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="rejectGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <Line
                    type="monotone"
                    dataKey="Passed"
                    name="Passed"
                    stroke="url(#passedGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                    type="monotone"
                    dataKey="Reject"
                    name="Reject"
                    stroke="url(#rejectGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '13px', color: '#94a3b8' }}
                    iconType="circle"
                    iconSize={8}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

