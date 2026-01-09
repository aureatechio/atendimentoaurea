import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { Activity, TrendingUp, Users, MessageSquare, PieChart as PieChartIcon } from 'lucide-react';

interface ChartData {
  conversationsLast7Days: { date: string; conversations: number; messages: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
  agentPerformance: { name: string; resolved: number; pending: number; active: number }[];
  hourlyActivity: { hour: string; messages: number }[];
}

interface DashboardChartsProps {
  data: ChartData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 shadow-xl">
        <p className="text-[#8b949e] text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ConversationsChart({ data }: { data: ChartData['conversationsLast7Days'] }) {
  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Evolução Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis 
                dataKey="date" 
                stroke="#8b949e" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#8b949e" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-[#8b949e] text-xs">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="conversations"
                name="Conversas"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#conversationsGradient)"
              />
              <Area
                type="monotone"
                dataKey="messages"
                name="Mensagens"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#messagesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusDistributionChart({ data }: { data: ChartData['statusDistribution'] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-purple-400" />
          Distribuição de Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] flex items-center">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-[#e6edf3]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#e6edf3]">{item.value}</span>
                  <span className="text-xs text-[#8b949e]">
                    ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentPerformanceChart({ data }: { data: ChartData['agentPerformance'] }) {
  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          Desempenho por Agente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#8b949e" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#8b949e" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-[#8b949e] text-xs">{value}</span>}
              />
              <Bar dataKey="resolved" name="Resolvidas" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="active" name="Em Atend." fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="pending" name="Pendentes" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function HourlyActivityChart({ data }: { data: ChartData['hourlyActivity'] }) {
  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-400" />
          Atividade por Hora (Hoje)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis 
                dataKey="hour" 
                stroke="#8b949e" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#8b949e" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="messages" 
                name="Mensagens"
                fill="url(#barGradient)" 
                radius={[4, 4, 0, 0]}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceGaugeCard({ 
  title, 
  value, 
  maxValue, 
  color, 
  icon: Icon 
}: { 
  title: string; 
  value: number; 
  maxValue: number;
  color: string;
  icon: React.ElementType;
}) {
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  
  const gaugeData = [
    { name: 'value', value: percentage, fill: color },
  ];

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#8b949e] uppercase tracking-wide">{title}</p>
          <Icon className="h-4 w-4 text-[#8b949e]" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[80px] w-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="60%" 
                outerRadius="100%" 
                barSize={8}
                data={gaugeData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: '#30363d' }}
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#e6edf3]">{value}</p>
            <p className="text-xs text-[#8b949e]">de {maxValue}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
