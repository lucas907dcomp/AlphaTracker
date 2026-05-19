import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface PnLBarChartProps {
  data: { label: string; pnl: number }[]
}

export function PnLBarChart({ data }: PnLBarChartProps) {
  if (data.length === 0) {
    return <p className="text-slate-700 text-center py-8 text-sm">Sem dados no período.</p>
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 12 }}
            itemStyle={{ color: '#e2e8f0', fontSize: 12 }}
            formatter={(v) => [`R$ ${Number(v).toFixed(2).replace('.', ',')}`, 'PnL']}
          />
          <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.pnl >= 0 ? '#4ade80' : '#f87171'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
