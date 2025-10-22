'use client';

interface PositionsPanelProps {
  positions: any[];
}

export function PositionsPanel({ positions }: PositionsPanelProps) {
  const totalPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);
  const totalValue = positions.reduce((sum, p) => sum + (p.size || 0), 0);

  return (
    <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-yellow-400">📊 Positions</h3>
        <span className="text-xs text-gray-500">{positions.length} active</span>
      </div>

      {/* Summary */}
      <div className="mb-4 pb-4 border-b border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Total Value</span>
          <span className="text-sm font-bold text-white">
            ${totalValue.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Unrealized P&L</span>
          <span className={`text-lg font-bold ${
            totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Position List */}
      <div className="space-y-3">
        {positions.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-gray-600 text-3xl mb-2">📊</div>
            <div className="text-xs text-gray-500">No active positions</div>
          </div>
        ) : (
          positions.map((position, idx) => (
            <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded p-3">
              {/* Symbol & Side */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">{position.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    position.side === 'LONG' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {position.side}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{position.leverage}x</span>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <div>
                  <div className="text-gray-500">Entry</div>
                  <div className="text-white font-medium">${position.entryPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Current</div>
                  <div className="text-white font-medium">${position.currentPrice.toFixed(2)}</div>
                </div>
              </div>

              {/* P&L */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-xs text-gray-500">P&L</span>
                <div className="text-right">
                  <div className={`text-sm font-bold ${
                    position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.unrealizedPnL >= 0 ? '+' : ''}{position.unrealizedPnL.toFixed(2)}%
                  </div>
                  <div className={`text-xs ${
                    position.unrealizedPnL >= 0 ? 'text-green-500/60' : 'text-red-500/60'
                  }`}>
                    ${((position.size * position.unrealizedPnL) / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* TP/SL */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-700 text-xs">
                <div>
                  <div className="text-gray-600">SL</div>
                  <div className="text-red-400 font-medium">${position.stopLoss.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-600">TP</div>
                  <div className="text-green-400 font-medium">${position.takeProfit.toFixed(2)}</div>
                </div>
              </div>

              {position.isTrailingSL && (
                <div className="mt-2 text-xs text-purple-400 flex items-center">
                  <span className="mr-1">🔄</span>
                  <span>Trailing SL Active</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

