'use client';

import { format } from 'date-fns';

interface AgentCardProps {
  agent: 'agent1' | 'agent2' | 'agent3';
  message: any;
  agentName: string;
  agentIcon: string;
}

export function AgentCard({ agent, message, agentName, agentIcon }: AgentCardProps) {
  const data = message?.data;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/30 transition-colors">
      {/* Agent Header - Simplified */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-bold ${
            agent === 'agent1' ? 'text-blue-400' :
            agent === 'agent2' ? 'text-purple-400' : 'text-green-400'
          }`}>
            AGENT {agent.replace('agent', '')}
          </span>
        </div>
        <span className="text-xs text-gray-600">
          {message?.timestamp && format(new Date(message.timestamp), 'HH:mm:ss')}
        </span>
      </div>

      {/* Agent 1: 市场分析和交易计划 */}
      {agent === 'agent1' && (
        <div className="space-y-2">
          {data?.initialStrategy ? (
            <>
              {/* Analysis Content - 只显示分析内容 */}
              <div className="text-xs text-gray-300 leading-relaxed">
                {data.initialStrategy.reasoning || 'Analyzing market...'}
              </div>

              {/* Quick Plan Summary */}
              <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-600">Direction</div>
                  <div className={`font-bold ${
                    data.initialStrategy.side === 'LONG' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {data.initialStrategy.side}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Entry</div>
                  <div className="text-yellow-400 font-medium">
                    ${Math.floor(data.initialStrategy.entryPrice)?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Size</div>
                  <div className="text-white font-medium">
                    ${Math.floor(data.initialStrategy.positionSize)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-600 py-4">Analyzing market...</div>
          )}
        </div>
      )}

      {/* Agent 2: 策略优化 */}
      {agent === 'agent2' && (
        <div className="space-y-2">
          {data?.optimizedStrategy ? (
            <>
              {/* Optimization Reasoning - 只显示优化内容 */}
              <div className="text-xs text-gray-300 leading-relaxed">
                {data.optimizationReasoning || 
                 data.riskAssessment?.reasons?.join('. ') || 
                 'Optimizing strategy...'}
              </div>

              {/* Decision */}
              <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                <div className={`text-xs font-bold ${
                  data.riskAssessment?.recommendation === 'APPROVE' ? 'text-green-400' :
                  data.riskAssessment?.recommendation === 'REDUCE_SIZE' ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {data.riskAssessment?.recommendation}
                </div>
                <div className="text-xs text-gray-600">
                  Risk: {data.riskAssessment?.score?.toFixed(1)}/10
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-600 py-4">Optimizing...</div>
          )}
        </div>
      )}

      {/* Agent 3: 执行说明 */}
      {agent === 'agent3' && (
        <div className="space-y-2">
          {data ? (
            <>
              {/* Execution Status */}
              <div className="text-xs text-gray-300 leading-relaxed">
                {data.executedTrades && data.executedTrades.length > 0 ? (
                  <>
                    ✅ Position opened on Aster DEX. Stop loss and take profit orders set. 
                    Real-time monitoring activated - checking every 5 seconds for TP/SL triggers. 
                    Position will auto-close when targets are reached.
                  </>
                ) : (
                  <>
                    ⏸️ Execution plan ready. Awaiting manual approval or sufficient account balance. 
                    Review the strategy above and enable auto-execution in settings if you approve.
                  </>
                )}
              </div>

              {/* Execution Details */}
              {data.executedTrades && data.executedTrades.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs">
                  <div className="text-gray-600 mb-1">Order ID:</div>
                  <div className="text-gray-400 font-mono text-xs break-all">
                    {String(data.executedTrades[0].orderId || '').substring(0, 24) || 'N/A'}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-600 py-4">Waiting for execution...</div>
          )}
        </div>
      )}
    </div>
  );
}
