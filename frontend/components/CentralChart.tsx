'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';
import axios from 'axios';

interface CentralChartProps {
  positions: any[];
}

export function CentralChart({ positions }: CentralChartProps) {
  const [walletPnL, setWalletPnL] = useState<any[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch wallet P&L history
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
        const [walletRes, positionsRes] = await Promise.all([
          axios.get(`${baseURL}/api/wallet`),
          axios.get(`${baseURL}/api/positions`),
        ]);

        // 计算当前总盈亏
        let currentPnL = 0;
        let currentPnLPercent = 0;

        if (positionsRes.data && positionsRes.data.length > 0) {
          const totalUnrealizedPnL = positionsRes.data.reduce((sum: number, p: any) => {
            const pnlAmount = (p.size * p.unrealizedPnL) / 100;
            return sum + pnlAmount;
          }, 0);

          currentPnL = totalUnrealizedPnL;
          currentPnLPercent = positionsRes.data.reduce((sum: number, p: any) => 
            sum + p.unrealizedPnL, 0) / positionsRes.data.length;
        }

        setTotalPnL(currentPnL);
        setTotalPnLPercent(currentPnLPercent);
        setIsInitialized(true);

        // 添加到历史数据（每5秒一个点）
        setWalletPnL(prev => {
          const now = Date.now();
          const newPoint = {
            timestamp: now,
            pnl: currentPnL,
            pnlPercent: currentPnLPercent,
          };
          
          const updated = [...prev, newPoint];
          // 保留最近12小时的数据
          return updated.slice(-8640);
        });

      } catch (error) {
        console.warn('⚠️ Failed to fetch wallet P&L data');
        // 即使失败也标记为已初始化，避免一直loading
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    };

    fetchWalletData();
    const interval = setInterval(fetchWalletData, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    // 始终生成基础波动线数据
    const now = Date.now();
    const baseData = [];
    
    for (let i = 240; i >= 0; i--) {
      const timestamp = now - i * 60 * 1000;
      const noise = (Math.random() - 0.5) * 0.5;
      
      baseData.push({
        time: format(new Date(timestamp), 'MMM dd HH:mm'),
        pnl: noise,
      });
    }
    
    // 如果没有真实P&L数据，返回基础波动线
    if (walletPnL.length === 0 || !isInitialized) {
      return baseData;
    }

    // 使用真实钱包盈亏数据
    // 按小时聚合数据
    const hourlyData: { [key: string]: { pnl: number[], count: number } } = {};
    
    walletPnL.forEach(point => {
      const hourKey = format(new Date(point.timestamp), 'MMM dd HH:00');
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { pnl: [], count: 0 };
      }
      hourlyData[hourKey].pnl.push(point.pnl);
      hourlyData[hourKey].count++;
    });

    // 转换为图表数据
    return Object.keys(hourlyData).map(timeKey => ({
      time: timeKey,
      pnl: hourlyData[timeKey].pnl.reduce((a, b) => a + b, 0) / hourlyData[timeKey].count,
    })).slice(-24); // 最近24小时

  }, [walletPnL]);

  // 计算统计数据
  const maxPnL = Math.max(...chartData.map(d => d.pnl), 0);
  const minPnL = Math.min(...chartData.map(d => d.pnl), 0);
  const avgPnL = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.pnl, 0) / chartData.length 
    : 0;

  return (
    <div className="flex-1 flex flex-col relative bg-black">
      {/* Wallet P&L Info Overlay */}
      <div className="absolute top-6 right-6 z-10 bg-gray-900/90 backdrop-blur-sm border border-yellow-500/40 rounded-lg p-5 shadow-xl shadow-yellow-500/10">
        <div className="text-xs text-gray-500 mb-1">Total P&L</div>
        <div className={`text-4xl font-bold mb-2 ${
          totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
        </div>
        <div className="flex items-center space-x-3 text-base mb-2">
          <span className={`font-bold ${totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">${maxPnL.toFixed(2)}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>${minPnL.toFixed(2)}</span>
          <span>•</span>
          <span>${avgPnL.toFixed(2)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-600">
          Wallet Performance
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-6 py-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="#EAB308" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#4b5563"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
            />
            <YAxis
              stroke="#4b5563"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
              tickFormatter={(value) => value >= 0 ? `+$${value.toFixed(0)}` : `-$${Math.abs(value).toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '2px solid #EAB308',
                borderRadius: '12px',
                padding: '12px',
              }}
              labelStyle={{ color: '#FBBF24', fontSize: 12, marginBottom: 8 }}
              itemStyle={{ color: '#EAB308', fontSize: 14, fontWeight: 'bold' }}
              formatter={(value: any) => [`${value >= 0 ? '+' : ''}$${value.toFixed(2)}`, 'P&L']}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="#EAB308"
              strokeWidth={2.5}
              fill="url(#pnlGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
