'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Iteration {
  round: number
  price: number
  margin: number
  dailySales: number
  gmv: number
}

interface ConvergenceChartProps {
  iterations: Iteration[]
  targetMargin: number
  animatedCount: number
}

export default function ConvergenceChart({
  iterations,
  targetMargin,
  animatedCount,
}: ConvergenceChartProps) {
  const data = iterations.slice(0, animatedCount).map((it) => ({
    ...it,
    marginPct: it.margin * 100,
  }))

  return (
    <div className="relative">
      {/* Formula display */}
      <div className="absolute top-0 right-0 text-xs font-mono text-muted-foreground z-10">
        L(p) = q(p)&middot;p &minus; &lambda;(c/p &minus; m&#8320;)
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="round"
            label={{ value: '迭代', position: 'insideBottomRight', offset: -5, fill: '#888' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'GMV ¥', angle: -90, position: 'insideLeft', fill: '#4ade80' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: '毛利率%', angle: 90, position: 'insideRight', fill: '#f59e0b' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              color: 'hsl(var(--foreground))',
            }}
          />
          <ReferenceLine
            yAxisId="right"
            y={targetMargin * 100}
            stroke="#f59e0b"
            strokeDasharray="6 3"
            label={{
              value: `目标 ${(targetMargin * 100).toFixed(0)}%`,
              fill: '#f59e0b',
              fontSize: 11,
              position: 'right',
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="gmv"
            stroke="#4ade80"
            strokeWidth={2}
            dot={{ r: 4, fill: '#4ade80' }}
            name="GMV"
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="marginPct"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4, fill: '#f59e0b' }}
            name="毛利率"
            isAnimationActive={false}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-muted-foreground text-xs">{value}</span>
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
