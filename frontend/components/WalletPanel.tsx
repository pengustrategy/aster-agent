'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export function WalletPanel() {
  const [walletInfo, setWalletInfo] = useState<any>(null);

  useEffect(() => {
    fetchWalletInfo();
    const interval = setInterval(fetchWalletInfo, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchWalletInfo = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await axios.get(`${baseURL}/api/wallet`);
      setWalletInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch wallet info:', error);
    }
  };

  if (!walletInfo) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="text-xs text-gray-500">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-yellow-400">💼 Wallet</h3>
        {walletInfo.connected && (
          <span className="text-xs text-green-400">● Connected</span>
        )}
      </div>

      {/* Wallet Address */}
      <div className="mb-4 pb-4 border-b border-gray-800">
        <div className="text-xs text-gray-500 mb-1">Address</div>
        <div className="text-xs font-mono text-gray-300 break-all">
          {walletInfo.address || 'Not configured'}
        </div>
      </div>

      {/* Balances */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img 
              src="https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png"
              alt="BNB"
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs text-gray-400">BNB</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-yellow-400">
              {parseFloat(walletInfo.bnbBalance || 0).toFixed(4)}
            </div>
            <div className="text-xs text-gray-500">
              ≈ ${(parseFloat(walletInfo.bnbBalance || 0) * 600).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img 
              src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
              alt="USDT"
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs text-gray-400">USDT</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-green-400">
              ${parseFloat(walletInfo.usdtBalance || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              Available for trading
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <span className="text-blue-500 text-sm">⛽</span>
            </div>
            <span className="text-xs text-gray-400">Gas Price</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-400">
              {parseFloat(walletInfo.gasPrice || 0).toFixed(1)} Gwei
            </div>
          </div>
        </div>
      </div>

      {/* Network Info */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Network</span>
          <span className="text-gray-400">BSC Mainnet</span>
        </div>
      </div>
    </div>
  );
}

