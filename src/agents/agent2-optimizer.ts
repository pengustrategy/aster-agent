/**
 * Agent 2: Strategy Optimizer
 * 
 * Responsibilities:
 * - Receive strategy from Agent 1
 * - Apply quantitative optimization
 * - Calculate optimal TP/SL with trailing options
 * - Perform risk assessment
 * - Generate optimized strategy for Agent 3
 */

import { claudeService } from '../services/claude.service';
import { riskManager } from '../utils/risk-manager';
import type { Agent2Output, TradingStrategy, Position } from '../types';

export class Agent2Optimizer {
  /**
   * Main execution function
   */
  async execute(
    initialStrategy: TradingStrategy,
    currentPositions: Position[] = [],
    walletBalance?: number
  ): Promise<Agent2Output> {
    console.log('\n🤖 === AGENT 2: Strategy Optimizer Starting === 🤖\n');

    try {
      // Step 0: Check position limits and optimize
      const { config } = await import('../config');
      
      // Check 1: Maximum concurrent positions
      if (currentPositions.length >= config.trading.maxConcurrentPositions) {
        console.log(`❌ Maximum concurrent positions reached: ${currentPositions.length}/${config.trading.maxConcurrentPositions}`);
        return {
          optimizedStrategy: initialStrategy,
          riskAssessment: {
            score: 10,
            factors: [],
            recommendation: 'REJECT',
            reasons: [`Maximum concurrent positions (${config.trading.maxConcurrentPositions}) already open`],
          },
          tpSlConfig: { stopLoss: initialStrategy.stopLoss, takeProfit: initialStrategy.takeProfit },
          alternatives: [],
          timestamp: new Date(),
        } as any;
      }

      // Check 2: No duplicate positions for same symbol
      const existingPosition = currentPositions.find(p => p.symbol === initialStrategy.symbol);
      if (existingPosition) {
        console.log(`❌ Position already exists for ${initialStrategy.symbol}`);
        return {
          optimizedStrategy: initialStrategy,
          riskAssessment: {
            score: 10,
            factors: [],
            recommendation: 'REJECT',
            reasons: [`Already have open position for ${initialStrategy.symbol}`],
          },
          tpSlConfig: { stopLoss: initialStrategy.stopLoss, takeProfit: initialStrategy.takeProfit },
          alternatives: [],
          timestamp: new Date(),
        } as any;
      }

      // Check 3: Symbol whitelist
      if (!config.trading.allowedSymbols.includes(initialStrategy.symbol)) {
        console.log(`❌ Symbol ${initialStrategy.symbol} not in allowed list`);
        return {
          optimizedStrategy: initialStrategy,
          riskAssessment: {
            score: 10,
            factors: [],
            recommendation: 'REJECT',
            reasons: [`Symbol ${initialStrategy.symbol} not allowed. Only trade: ${config.trading.allowedSymbols.join(', ')}`],
          },
          tpSlConfig: { stopLoss: initialStrategy.stopLoss, takeProfit: initialStrategy.takeProfit },
          alternatives: [],
          timestamp: new Date(),
        } as any;
      }

      // Step 1: Auto-optimize based on wallet balance (10% per position)
      if (walletBalance) {
        console.log(`💰 Wallet Balance: $${walletBalance.toFixed(2)}`);
        const positionPercent = config.trading.positionSizePercent / 100;
        const maxSafePosition = Math.min(
          walletBalance * positionPercent, // 10% of balance per trade
          config.trading.maxPositionSize
        );
        initialStrategy.positionSize = maxSafePosition;
        console.log(`✅ Auto-adjusted position size to $${maxSafePosition.toFixed(2)} (${config.trading.positionSizePercent}% of balance)`);
        console.log(`✅ Position check: ${currentPositions.length}/${config.trading.maxConcurrentPositions} active`);
      }

      // Step 1: Risk assessment of initial strategy
      console.log('\n🛡️  Step 1: Performing risk assessment...');
      const riskAssessment = riskManager.assessRisk(initialStrategy, currentPositions);
      console.log(`✅ Risk Score: ${riskAssessment.score.toFixed(2)}/10`);
      console.log(`   Recommendation: ${riskAssessment.recommendation}`);
      riskAssessment.reasons.forEach(reason => console.log(`   - ${reason}`));

      // Step 2: Optimize strategy with Claude AI
      console.log('\n🧠 Step 2: Optimizing strategy with Claude AI...');
      const optimizedStrategy = await claudeService.optimizeStrategy({
        initialStrategy,
        currentPositions,
      });

      // Step 3: Calculate precise TP/SL prices
      console.log('\n💹 Step 3: Calculating TP/SL prices...');
      const tpSlConfig = this.calculateTPSL(optimizedStrategy);
      console.log(`✅ Stop Loss: $${tpSlConfig.stopLoss.price?.toFixed(2)} (${tpSlConfig.stopLoss.percentage}%)`);
      console.log(`✅ Take Profit: $${tpSlConfig.takeProfit.price?.toFixed(2)} (${tpSlConfig.takeProfit.percentage}%)`);

      // Step 4: Generate alternative strategies
      console.log('\n📋 Step 4: Generating alternative strategies...');
      const alternatives = this.generateAlternatives(optimizedStrategy);
      console.log(`✅ Generated ${alternatives.length} alternative strategies`);

      console.log('\n✅ === AGENT 2: Optimization Complete === ✅');
      console.log(`   Original Entry: $${initialStrategy.entryPrice}`);
      console.log(`   Optimized Entry: $${optimizedStrategy.entryPrice}`);
      console.log(`   Original Leverage: ${initialStrategy.leverage}x`);
      console.log(`   Optimized Leverage: ${optimizedStrategy.leverage}x`);
      console.log(`   Original Position Size: $${initialStrategy.positionSize}`);
      console.log(`   Optimized Position Size: $${optimizedStrategy.positionSize}`);

      return {
        optimizedStrategy,
        riskAssessment,
        tpSlConfig,
        backtestResults: optimizedStrategy.backtestResults,
        alternatives,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('\n❌ === AGENT 2: Error === ❌');
      console.error(error);
      throw error;
    }
  }

  /**
   * Calculate precise TP/SL prices
   */
  private calculateTPSL(strategy: TradingStrategy) {
    const stopLossPrice = riskManager.calculateStopLoss(
      strategy.entryPrice,
      strategy.side,
      strategy.stopLoss.percentage
    );

    const takeProfitPrice = riskManager.calculateTakeProfit(
      strategy.entryPrice,
      strategy.side,
      strategy.takeProfit.percentage
    );

    return {
      stopLoss: {
        ...strategy.stopLoss,
        price: stopLossPrice,
      },
      takeProfit: {
        ...strategy.takeProfit,
        price: takeProfitPrice,
      },
    };
  }

  /**
   * Generate alternative strategies
   */
  private generateAlternatives(strategy: TradingStrategy): TradingStrategy[] {
    const alternatives: TradingStrategy[] = [];

    // Alternative 1: Conservative (lower leverage, tighter SL)
    alternatives.push({
      ...strategy,
      id: `alt_conservative_${Date.now()}`,
      leverage: Math.max(1, Math.floor(strategy.leverage / 2)),
      positionSize: strategy.positionSize * 0.75,
      stopLoss: {
        ...strategy.stopLoss,
        percentage: strategy.stopLoss.percentage * 0.75,
      },
      takeProfit: {
        ...strategy.takeProfit,
        percentage: strategy.takeProfit.percentage * 0.75,
      },
      reasoning: 'Conservative alternative: Lower risk, lower reward',
    });

    // Alternative 2: Aggressive (higher leverage, wider SL)
    if (strategy.leverage < 15) {
      alternatives.push({
        ...strategy,
        id: `alt_aggressive_${Date.now()}`,
        leverage: Math.min(20, Math.ceil(strategy.leverage * 1.5)),
        positionSize: strategy.positionSize * 1.25,
        stopLoss: {
          ...strategy.stopLoss,
          percentage: strategy.stopLoss.percentage * 1.25,
        },
        takeProfit: {
          ...strategy.takeProfit,
          percentage: strategy.takeProfit.percentage * 1.5,
        },
        reasoning: 'Aggressive alternative: Higher risk, higher reward',
      });
    }

    return alternatives;
  }
}

export const agent2 = new Agent2Optimizer();

