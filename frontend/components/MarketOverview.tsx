'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export function MarketOverview() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [marketData, setMarketData] = useState<any>({
    BTC: { price: 0, change: 0 },
    ETH: { price: 0, change: 0 },
    BNB: { price: 0, change: 0 },
    SOL: { price: 0, change: 0 },
  });

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await axios.get(`${baseURL}/api/tickers`);
        if (response.data) {
          setMarketData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch market data');
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000);
    return () => clearInterval(interval);
  }, []);

  const symbols = ['BTC', 'ETH', 'BNB', 'SOL'];

  return (
    <div className="bg-gray-900/50 border-b border-gray-800 p-3">
      <h2 className="text-xs text-gray-500 mb-2">Market Overview</h2>
      <div className="grid grid-cols-4 gap-3">
        {symbols.map(symbol => {
          const data = marketData[symbol] || { price: 0, change: 0 };
          const isPositive = data.change >= 0;
          const isSelected = symbol === selectedSymbol;

          return (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={`p-3 rounded border transition-all ${
                isSelected 
                  ? 'border-yellow-500 bg-yellow-500/10' 
                  : 'border-gray-800 bg-gray-900/30 hover:border-yellow-500/50'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">{symbol}/USDT</div>
              <div className="text-lg font-bold text-yellow-400">
                ${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm font-medium ${
                isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {isPositive ? '↑' : '↓'} {Math.abs(data.change).toFixed(2)}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

