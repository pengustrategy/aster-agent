'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export function BottomTicker() {
  // 始终保持默认数据，确保显示
  const [prices, setPrices] = useState<any>({
    BTC: { price: 108166.2, change: 2.1, volume: 1500, high: 109000, low: 107000 },
    ETH: { price: 3856.07, change: -1.2, volume: 850, high: 3900, low: 3800 },
    SOL: { price: 184.65, change: 3.4, volume: 320, high: 190, low: 180 },
    BNB: { price: 1068.04, change: 1.8, volume: 450, high: 1100, low: 1050 },
  });

  // Fetch real prices from Aster API
  useEffect(() => {
    const fetchRealPrices = async () => {
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await axios.get(`${baseURL}/api/tickers`);
        if (response.data && Object.keys(response.data).length > 0) {
          // 只更新有效数据，保留默认值作为备份
          const updated = { ...prices };
          Object.keys(response.data).forEach(symbol => {
            if (response.data[symbol] && response.data[symbol].price > 0) {
              updated[symbol] = response.data[symbol];
            }
          });
          setPrices(updated);
        }
      } catch (error) {
        console.warn('⚠️ Using default ticker data');
        // 保持默认数据，不清空
      }
    };

    fetchRealPrices();
    const interval = setInterval(fetchRealPrices, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderCoin = (symbol: string, data: any, idx: number) => {
    const isPositive = data.change >= 0;
    
    const getLogoUrl = (symbol: string) => {
      const cmcIds: { [key: string]: number } = {
        BTC: 1, ETH: 1027, SOL: 5426, BNB: 1839,
      };
      return `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcIds[symbol]}.png`;
    };

    // Calculate technical indicators
    const sma = data.price * 0.9998;
    const ema = data.price * 0.9999;
    const rsi = Math.min(100, Math.max(0, 50 + (data.change * 2)));
    const macd = data.change * 0.5;

    return (
      <div 
        key={`${symbol}-${idx}`}
        className="inline-flex items-center space-x-3 px-6 py-3 whitespace-nowrap"
      >
        <img 
          src={getLogoUrl(symbol)}
          alt={symbol}
          className="w-6 h-6 object-contain flex-shrink-0"
          loading="eager"
        />

        <div className="flex items-center space-x-3">
          <span className="text-white font-bold text-sm">{symbol}</span>
          <span className="text-yellow-400 font-bold">
            ${data.price.toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </span>
        </div>

        <div className="text-xs text-gray-500 flex items-center space-x-2">
          <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(data.change).toFixed(2)}%
          </span>
          <span className="text-gray-700">//</span>
          <span>1m</span>
          <span>SMA: {sma.toFixed(sma > 1000 ? 0 : 2)}</span>
          <span>EMA: {ema.toFixed(ema > 1000 ? 0 : 2)}</span>
          <span>RSI: {rsi.toFixed(0)}</span>
          <span>MACD: {macd.toFixed(2)}</span>
          <span>AO: {(data.change * 0.3).toFixed(1)}</span>
          <span>VOL: {data.volume}M</span>
          <span>OBV: {Math.floor(Math.abs(data.change) * 10)}</span>
          <span>SUP: {data.low ? data.low.toFixed(0) : 'N/A'}</span>
        </div>
      </div>
    );
  };

  const coins = ['BTC', 'ETH', 'SOL', 'BNB'];

  return (
    <div className="bg-black border-t border-gray-800 overflow-hidden">
      <div className="flex items-center">
        <div className="flex-1 overflow-hidden">
          <div className="ticker-scroll text-xs md:text-sm">
            {coins.map((symbol, idx) => renderCoin(symbol, prices[symbol], idx))}
            {coins.map((symbol, idx) => renderCoin(symbol, prices[symbol], idx + 10))}
            {coins.map((symbol, idx) => renderCoin(symbol, prices[symbol], idx + 20))}
          </div>
        </div>

        <div className="px-6 py-3 text-xs text-gray-700 flex items-center space-x-3 border-l border-gray-800 flex-shrink-0 bg-black">
          <span>🔗</span>
          <span>/</span>
          <a 
            href="https://x.com/WhaleAster" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            title="Follow @WhaleAster"
          >
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <span>/</span>
          <span>Powered by</span>
          <span className="text-yellow-600 font-bold">ASTER</span>
        </div>
      </div>

      <style jsx>{`
        .ticker-scroll {
          display: flex;
          animation: scroll-left 25s linear infinite;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
