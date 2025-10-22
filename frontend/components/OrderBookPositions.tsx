'use client';

interface OrderBookPositionsProps {
  positions: any[];
}

export function OrderBookPositions({ positions }: OrderBookPositionsProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <h3 className="text-sm font-bold text-yellow-400">Active Positions by AI Trader</h3>
        <span className="text-xs text-gray-500">{positions.length} active</span>
      </div>

      {/* Positions List */}
      <div className="divide-y divide-gray-800">
        {positions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-700 text-3xl mb-2">📊</div>
            <div className="text-xs text-gray-600">No active positions</div>
          </div>
        ) : (
          positions.map((position, idx) => (
            <div key={idx} className="p-3 hover:bg-gray-800/30 transition-colors">
              {/* Position Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-bold">{position.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    position.side === 'LONG' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {position.side}
                  </span>
                  <span className="text-xs text-gray-600">{position.leverage}x</span>
                </div>
                <div className={`text-sm font-bold ${
                  position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {position.unrealizedPnL >= 0 ? '+' : ''}{position.unrealizedPnL.toFixed(2)}%
                </div>
              </div>

              {/* Position Details - Order Book Style */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-gray-600">Entry</div>
                  <div className="text-white font-medium">${position.entryPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Current</div>
                  <div className="text-yellow-400 font-medium">${position.currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Qty</div>
                  <div className="text-gray-400">{(position.size / position.currentPrice).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-gray-600">P&L</div>
                  <div className={`font-bold ${
                    position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${((position.size * position.unrealizedPnL) / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* TP/SL */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800 text-xs">
                <div>
                  <span className="text-red-400">SL:</span>
                  <span className="ml-1 text-gray-400">${position.stopLoss.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-green-400">TP:</span>
                  <span className="ml-1 text-gray-400">${position.takeProfit.toFixed(0)}</span>
                </div>
                {position.isTrailingSL && (
                  <div className="text-purple-400">🔄 Trailing</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

