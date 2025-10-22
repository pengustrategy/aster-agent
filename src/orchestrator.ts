/**
 * Agent Orchestrator
 * 
 * Coordinates the three-agent collaboration system:
 * Agent 1 (Collector) → Agent 2 (Optimizer) → Agent 3 (Executor) → Feedback Loop
 */

import { agent1 } from './agents/agent1-collector';
import { agent2 } from './agents/agent2-optimizer';
import { agent3 } from './agents/agent3-executor';
import { config } from './config';
import type { AgentMessage, AgentType } from './types';

export class AgentOrchestrator {
  private isRunning: boolean = false;
  private cycleInterval: NodeJS.Timeout | null = null;
  private conversationHistory: AgentMessage[] = [];

  /**
   * Start the automated trading system
   */
  async start(symbol: string = 'BTCUSDT'): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  System is already running');
      return;
    }

    this.isRunning = true;
    console.log('\n🚀 ========================================');
    console.log('🚀  Aster Trading Agents System Starting');
    console.log('🚀 ========================================\n');
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Cycle Interval: ${config.agents.cycleInterval / 1000 / 60} minutes`);
    console.log(`   Auto Trading: ${config.agents.autoTradingEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Manual Approval: ${config.agents.manualApprovalRequired ? 'REQUIRED' : 'NOT REQUIRED'}`);
    console.log('\n========================================\n');

    // Run first cycle immediately
    await this.runCycle(symbol);

    // Schedule recurring cycles
    if (config.agents.autoTradingEnabled) {
      this.cycleInterval = setInterval(() => {
        this.runCycle(symbol);
      }, config.agents.cycleInterval);
    }
  }

  /**
   * Run a complete agent cycle
   */
  async runCycle(symbol: string): Promise<void> {
    console.log('\n');
    console.log('═══════════════════════════════════════════');
    console.log(`   NEW TRADING CYCLE - ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════\n');

    try {
      // === STAGE 1: Data Collection ===
      console.log('┌─────────────────────────────────────────┐');
      console.log('│  STAGE 1: Data Collection & Analysis   │');
      console.log('└─────────────────────────────────────────┘\n');

      const agent1Output = await agent1.execute(symbol);
      
      this.logConversation({
        agent: 'agent1' as AgentType,
        timestamp: new Date(),
        status: 'success' as any,
        data: agent1Output,
        nextAgent: 'agent2' as AgentType,
      });

      // === STAGE 2: Strategy Optimization ===
      console.log('\n┌─────────────────────────────────────────┐');
      console.log('│  STAGE 2: Strategy Optimization         │');
      console.log('└─────────────────────────────────────────┘\n');

      const currentPositions = agent3.getActivePositions();
      
      // Get wallet balance for auto-optimization
      const { bscService } = await import('./services/bsc.service');
      const walletInfo = await bscService.getWalletInfo();
      const walletBalance = parseFloat(walletInfo.usdtBalance || '0');
      console.log(`💰 Wallet USDT Balance: $${walletBalance.toFixed(2)}`);
      
      const agent2Output = await agent2.execute(
        agent1Output.initialStrategy,
        currentPositions,
        walletBalance
      );

      // Save optimization reasoning to conversation
      const agent2Data = {
        ...agent2Output,
        optimizationReasoning: (agent2Output as any).optimizationReasoning,
      };

      this.logConversation({
        agent: 'agent2' as AgentType,
        timestamp: new Date(),
        status: 'success' as any,
        data: agent2Data,
        nextAgent: 'agent3' as AgentType,
      });

      // Check if strategy is approved
      if (agent2Output.riskAssessment.recommendation === 'REJECT') {
        console.log('\n⚠️  === STRATEGY REJECTED BY AGENT 2 === ⚠️');
        console.log('   Reasons:');
        agent2Output.riskAssessment.reasons.forEach(reason => {
          console.log(`   - ${reason}`);
        });
        console.log('\n   Skipping execution for this cycle.\n');
        return;
      }

      // Reduce size if recommended
      if (agent2Output.riskAssessment.recommendation === 'REDUCE_SIZE') {
        console.log('\n⚠️  Risk assessment recommends reducing position size');
        agent2Output.optimizedStrategy.positionSize *= 0.5;
        console.log(`   Adjusted size: $${agent2Output.optimizedStrategy.positionSize}\n`);
      }

      // === STAGE 3: Execution ===
      console.log('\n┌─────────────────────────────────────────┐');
      console.log('│  STAGE 3: Trade Execution & Monitoring │');
      console.log('└─────────────────────────────────────────┘\n');

      // Manual approval if required
      if (config.agents.manualApprovalRequired) {
        console.log('⏸️  === MANUAL APPROVAL REQUIRED === ⏸️\n');
        console.log('   Strategy Summary:');
        console.log(`   - Symbol: ${agent2Output.optimizedStrategy.symbol}`);
        console.log(`   - Side: ${agent2Output.optimizedStrategy.side}`);
        console.log(`   - Entry: $${agent2Output.optimizedStrategy.entryPrice}`);
        console.log(`   - Leverage: ${agent2Output.optimizedStrategy.leverage}x`);
        console.log(`   - Size: $${agent2Output.optimizedStrategy.positionSize}`);
        console.log(`   - SL: ${agent2Output.optimizedStrategy.stopLoss.percentage}%`);
        console.log(`   - TP: ${agent2Output.optimizedStrategy.takeProfit.percentage}%\n`);
        console.log('   To approve, set MANUAL_APPROVAL_REQUIRED=false in .env\n');
        return;
      }

      try {
        const agent3Output = await agent3.execute(agent2Output.optimizedStrategy);

        this.logConversation({
          agent: 'agent3' as AgentType,
          timestamp: new Date(),
          status: 'success' as any,
          data: agent3Output,
        });

        console.log('\n═══════════════════════════════════════════');
        console.log('   CYCLE COMPLETE - All Agents Executed');
        console.log('═══════════════════════════════════════════\n');
      } catch (error) {
        console.error('\n❌ === AGENT 3: Execution Failed === ❌');
        console.error(error);
        
        // Still log the failure
        this.logConversation({
          agent: 'agent3' as AgentType,
          timestamp: new Date(),
          status: 'error' as any,
          data: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      console.log('\n═══════════════════════════════════════════');
      console.log('   CYCLE COMPLETE - All Agents Executed');
      console.log('═══════════════════════════════════════════\n');
    } catch (error) {
      console.error('\n❌ === CYCLE FAILED === ❌');
      console.error(error);
      console.error('\nWill retry in next cycle...\n');
    }
  }

  /**
   * Stop the system
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  System is not running');
      return;
    }

    console.log('\n🛑 Stopping Aster Trading Agents System...');

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }

    // Stop all monitoring
    agent3.stopAllMonitoring();

    this.isRunning = false;
    console.log('✅ System stopped\n');
  }

  /**
   * Log agent conversation and save to persistent storage
   */
  private logConversation(message: AgentMessage): void {
    this.conversationHistory.push(message);

    // Save to file-based history (persistent)
    try {
      const { HistoryManager } = require('./database/history');
      HistoryManager.saveConversation(message);
    } catch (error) {
      console.warn('Failed to save conversation to history:', error);
    }

    // Keep all messages in memory for current session
    // No limit - users can scroll through all history
  }

  /**
   * Get conversation history (includes persistent storage)
   */
  getConversationHistory(): AgentMessage[] {
    try {
      const { HistoryManager } = require('./database/history');
      const persistentHistory = HistoryManager.getConversations();
      
      // Combine persistent history with current session
      const allHistory = [...persistentHistory, ...this.conversationHistory];
      
      // Remove duplicates by timestamp (convert to string for comparison)
      const unique = allHistory.filter((msg, index, self) => {
        const timestamp = new Date(msg.timestamp).getTime();
        return index === self.findIndex((m) => new Date(m.timestamp).getTime() === timestamp);
      });
      
      // Sort by timestamp (newest first for display)
      unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return unique;
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      return this.conversationHistory;
    }
  }

  /**
   * Get system status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      activePositions: agent3.getActivePositions(),
      conversationCount: this.conversationHistory.length,
      config: {
        symbol: 'BTCUSDT',
        cycleInterval: config.agents.cycleInterval / 1000 / 60,
        autoTradingEnabled: config.agents.autoTradingEnabled,
        manualApprovalRequired: config.agents.manualApprovalRequired,
      },
    };
  }
}

export const orchestrator = new AgentOrchestrator();

