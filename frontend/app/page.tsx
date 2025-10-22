'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { AgentCard } from '../components/AgentCard';
import { CentralChart } from '../components/CentralChart';
import { BottomTicker } from '../components/BottomTicker';
import { TopControls } from '../components/TopControls';
import { WalletPanel } from '../components/WalletPanel';
import { PositionsPanel } from '../components/PositionsPanel';

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
      const [statusRes, positionsRes, conversationRes] = await Promise.all([
        axios.get('/api/status'),
        axios.get('/api/positions'),
        axios.get('/api/conversation'),
      ]);

      setSystemStatus(statusRes.data);
      setPositions(positionsRes.data);
      setConversation(conversationRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  const agent1Messages = conversation.filter(m => m.agent === 'agent1');
  const agent2Messages = conversation.filter(m => m.agent === 'agent2');
  const agent3Messages = conversation.filter(m => m.agent === 'agent3');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
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

      {/* Main Content - 3 Column Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Sidebar - Agent 1 & Agent 2 + Wallet */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          <div className="flex-shrink-0 p-4">
            {/* Wallet Info - Fixed at top */}
            <WalletPanel />
          </div>
          
          {/* Scrollable Agent Conversation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Interleaved Agent Messages - 对话模式 */}
            {conversation.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-700 text-4xl mb-3">🤖</div>
                <div className="text-xs text-gray-600">Waiting for Agent conversation...</div>
                <div className="text-xs text-gray-700 mt-2">System analyzing every 5 minutes</div>
              </div>
            ) : (
              conversation.slice().reverse().filter(m => m.agent === 'agent1' || m.agent === 'agent2').map((msg, idx) => (
                <AgentCard
                  key={idx}
                  agent={msg.agent as any}
                  message={msg}
                  agentName=""
                  agentIcon=""
                />
              ))
            )}
          </div>
        </div>

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col">
          <CentralChart positions={positions} />
        </div>

        {/* Right Sidebar - Agent 3 & Positions */}
        <div className="w-80 border-l border-gray-800 flex flex-col">
          <div className="flex-shrink-0 p-4">
            {/* Positions Panel - Fixed at top */}
            <PositionsPanel positions={positions} />
          </div>

          {/* Scrollable Agent 3 Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {agent3Messages.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-green-400">AGENT 3</span>
                  <span className="text-xs text-gray-600">--:--:--</span>
                </div>
                <div className="text-xs text-gray-600 py-6 text-center">
                  Awaiting execution...
                </div>
              </div>
            ) : (
              agent3Messages.slice().reverse().map((msg, idx) => (
                <AgentCard
                  key={idx}
                  agent="agent3"
                  message={msg}
                  agentName=""
                  agentIcon=""
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Ticker - Fixed at bottom */}
      <div className="flex-shrink-0">
        <BottomTicker />
      </div>
    </div>
  );
}
