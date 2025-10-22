'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { MarketOverview } from '../components/MarketOverview';
import { AgentRanking } from '../components/AgentRanking';
import { OrderBookPositions } from '../components/OrderBookPositions';
import { CentralChart } from '../components/CentralChart';
import { BottomTicker } from '../components/BottomTicker';
import { TopControls } from '../components/TopControls';

export default function Dashboard() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const [statusRes, positionsRes, conversationRes] = await Promise.all([
        axios.get(`${baseURL}/api/status`),
        axios.get(`${baseURL}/api/positions`),
        axios.get(`${baseURL}/api/conversation`),
      ]);

      setSystemStatus(statusRes.data);
      setPositions(positionsRes.data);
      setConversation(conversationRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await axios.post('/api/start', { symbol: 'BTCUSDT' });
      fetchData();
    } catch (error) {
      console.error('Failed to start system:', error);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post('/api/stop');
      fetchData();
    } catch (error) {
      console.error('Failed to stop system:', error);
    }
  };

  const handleRunCycle = async () => {
    try {
      await axios.post('/api/cycle', { symbol: 'BTCUSDT' });
      fetchData();
    } catch (error) {
      console.error('Failed to run cycle:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-yellow-400 text-lg">Loading Aster Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-gray-100 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex-shrink-0">
        <TopControls 
          systemStatus={systemStatus}
          onStart={handleStart}
          onStop={handleStop}
          onRunCycle={handleRunCycle}
        />
      </div>

      {/* Market Overview - 4 Coins */}
      <div className="flex-shrink-0">
        <MarketOverview />
      </div>

      {/* Main Content - 2 Column Layout (30% | 70%) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Sidebar - 30% */}
        <div className="w-full lg:w-[30%] border-r border-gray-800 flex flex-col overflow-hidden">
          {/* Agent Ranking */}
          <div className="flex-1 overflow-y-auto p-4">
            <AgentRanking conversation={conversation} />
          </div>
        </div>

        {/* Right Side - 70% */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Large Chart Area */}
          <div className="flex-1 min-h-0">
            <CentralChart positions={positions} />
          </div>

          {/* Positions / Order Book */}
          <div className="h-64 border-t border-gray-800 overflow-y-auto p-4">
            <OrderBookPositions positions={positions} />
          </div>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="flex-shrink-0">
        <BottomTicker />
      </div>
    </div>
  );
}
