'use client';

interface AgentRankingProps {
  conversation: any[];
}

export function AgentRanking({ conversation }: AgentRankingProps) {
  const agents = [
    {
      id: 'agent1',
      name: 'Claude Sonnet 4.5',
      icon: '🔬',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      id: 'agent2', 
      name: 'GPT-4o',
      icon: '⚙️',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      id: 'agent3',
      name: 'Perplexity Sonar',
      icon: '🚀',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
  ];

  const getAgentStats = (agentId: string) => {
    const messages = conversation.filter(m => m.agent === agentId);
    const successCount = messages.filter(m => m.status === 'success').length;
    const winRate = messages.length > 0 ? (successCount / messages.length) * 100 : 0;
    
    // Mock P&L for now
    const pnl = (Math.random() - 0.3) * 5;
    
    return {
      trades: messages.length,
      winRate,
      pnl,
      latest: messages[messages.length - 1],
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-yellow-400">AI Traders Competition</h2>
        <span className="text-xs text-gray-500">🟢 Live Trading</span>
      </div>

      {agents.map((agent, index) => {
        const stats = getAgentStats(agent.id);
        const isProfitable = stats.pnl >= 0;

        return (
          <div
            key={agent.id}
            className={`${agent.bgColor} border ${agent.borderColor} rounded-lg p-3`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{agent.icon}</span>
                <div>
                  <div className={`text-xs font-bold ${agent.color}`}>
                    #{index + 1} {agent.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    Trades: {stats.trades}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold ${
                isProfitable ? 'text-green-400' : 'text-red-400'
              }`}>
                P&L {isProfitable ? '+' : ''}{stats.pnl.toFixed(2)}%
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <span className="text-gray-600">Win Rate:</span>
                <span className={`ml-1 font-bold ${
                  stats.winRate >= 70 ? 'text-green-400' : 
                  stats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {stats.winRate.toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Balance:</span>
                <span className="ml-1 text-yellow-400 font-bold">
                  ${(Math.random() * 500 + 500).toFixed(0)} BNB
                </span>
              </div>
            </div>

            {/* Latest Strategy */}
            {stats.latest && (
              <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
                <span className="text-gray-600">Latest:</span>
                <span className="ml-1">
                  {agent.id === 'agent1' && stats.latest.data?.initialStrategy && (
                    `${stats.latest.data.initialStrategy.side} signal`
                  )}
                  {agent.id === 'agent2' && stats.latest.data?.riskAssessment && (
                    `${stats.latest.data.riskAssessment.recommendation}`
                  )}
                  {agent.id === 'agent3' && stats.latest.data?.executedTrades?.length > 0 && (
                    'Position opened'
                  )}
                  {(!stats.latest.data || 
                    (agent.id === 'agent3' && !stats.latest.data.executedTrades?.length)) && 
                    'Analyzing...'
                  }
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

