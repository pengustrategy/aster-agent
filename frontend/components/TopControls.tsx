'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface TopControlsProps {
  systemStatus: any;
  onStart: () => void;
  onStop: () => void;
  onRunCycle: () => void;
}

export function TopControls({ systemStatus, onStart, onStop, onRunCycle }: TopControlsProps) {
  return (
    <div className="bg-black border-b border-gray-800 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left - Logo & Title */}
        <div className="flex items-center space-x-3">
          <img 
            src="/aster_agent.png" 
            alt="Aster Agent" 
            className="h-10 w-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-yellow-400">
              Aster Agent
            </h1>
          </div>
        </div>

        {/* Right - Status & Links */}
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-xs text-gray-500">System Status</div>
            <div className={`text-sm font-bold ${
              systemStatus?.isRunning ? 'text-green-400' : 'text-gray-500'
            }`}>
              {systemStatus?.isRunning ? '● ACTIVE' : '○ STANDBY'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500">Daily P&L</div>
            <div className={`text-lg font-bold ${
              (systemStatus?.dailyStats?.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {(systemStatus?.dailyStats?.pnl || 0) >= 0 ? '+' : ''}
              {(systemStatus?.dailyStats?.pnl || 0).toFixed(2)}%
            </div>
          </div>
          
          <a 
            href="https://x.com/WhaleAster" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
            title="Follow @WhaleAster on X"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
