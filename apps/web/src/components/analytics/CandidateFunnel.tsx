'use client';

import React from 'react';
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export interface FunnelData {
  stage: string;
  count: number;
  fill?: string;
}

interface CandidateFunnelProps {
  data: FunnelData[];
  title?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function CandidateFunnel({ data, title = "Candidate Funnel" }: CandidateFunnelProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.fill || COLORS[index % COLORS.length]
  }));

  if (!data || data.length === 0) {
    return (
        <div className="w-full h-[300px] bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center text-slate-400">
            No data available for funnel.
        </div>
    )
  }

  return (
    <div className="w-full h-[400px] bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">{title}</h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
            <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#1e293b' }}
            />
            <Funnel
                dataKey="count"
                data={chartData}
                isAnimationActive
            >
                <LabelList position="right" fill="#475569" stroke="none" dataKey="stage" />
                {
                    chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))
                }
            </Funnel>
            </FunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
