import { config } from '../config';
import type { TradingStrategy, RiskAssessment, Position } from '../types';

export class RiskManager {
  private dailyPnL: number = 0;
  private dailyTrades: number = 0;
  private lastResetDate: Date = new Date();

  /**
   * Reset daily counters
   */
  private resetDailyCounters(): void {
    const now = new Date();
    if (now.getDate() !== this.lastResetDate.getDate()) {
      this.dailyPnL = 0;
      this.dailyTrades = 0;
      this.lastResetDate = now;
      console.log('📅 Daily counters reset');
    }
  }

  /**
   * Check if daily loss limit is exceeded
   */
  isDailyLossLimitExceeded(): boolean {
    this.resetDailyCounters();
    const lossLimit = config.trading.maxDailyLoss;
    const currentLossPercent = Math.abs(this.dailyPnL);

    if (currentLossPercent >= lossLimit) {
      console.error(`🛑 Daily loss limit exceeded: ${currentLossPercent.toFixed(2)}% >= ${lossLimit}%`);
      return true;
    }

    return false;
  }

  /**
   * Update daily P&L
   */
  updateDailyPnL(pnl: number): void {
    this.resetDailyCounters();
    this.dailyPnL += pnl;
    console.log(`💰 Daily P&L updated: ${this.dailyPnL.toFixed(2)}%`);
  }

  /**
   * Assess risk for a trading strategy
   */
  assessRisk(strategy: TradingStrategy, currentPositions: Position[]): RiskAssessment {
    const factors: Array<{ name: string; value: number; weight: number }> = [];

    // 1. Leverage risk
    const leverageRisk = strategy.leverage / config.trading.maxLeverage;
    factors.push({
      name: 'Leverage',
      value: leverageRisk,
      weight: 0.3,
    });

    // 2. Position size risk
    const sizeRisk = strategy.positionSize / config.trading.maxPositionSize;
    factors.push({
      name: 'Position Size',
      value: sizeRisk,
      weight: 0.2,
    });

    // 3. Confidence risk (inverse)
    const confidenceRisk = 1 - (strategy.confidence / 100);
    factors.push({
      name: 'Confidence',
      value: confidenceRisk,
      weight: 0.15,
    });

    // 4. Market risk (from strategy risk score)
    const marketRisk = strategy.riskScore / 10;
    factors.push({
      name: 'Market Conditions',
      value: marketRisk,
      weight: 0.25,
    });

    // 5. Concentration risk (multiple positions)
    const concentrationRisk = currentPositions.length / 5; // Max 5 concurrent positions
    factors.push({
      name: 'Concentration',
      value: Math.min(concentrationRisk, 1),
      weight: 0.1,
    });

    // Calculate weighted risk score (0-10)
    const totalScore = factors.reduce((sum, factor) => {
      return sum + (factor.value * factor.weight * 10);
    }, 0);

    // Determine recommendation
    let recommendation: 'APPROVE' | 'REJECT' | 'REDUCE_SIZE';
    const reasons: string[] = [];

    if (totalScore > 8) {
      recommendation = 'REJECT';
      reasons.push('Risk score too high (>8/10)');
    } else if (totalScore > 6) {
      recommendation = 'REDUCE_SIZE';
      reasons.push('Moderate-high risk detected');
      reasons.push('Suggest reducing position size by 50%');
    } else {
      recommendation = 'APPROVE';
    }

    // Additional checks
    if (this.isDailyLossLimitExceeded()) {
      recommendation = 'REJECT';
      reasons.push('Daily loss limit exceeded');
    }

    if (strategy.leverage > config.trading.maxLeverage) {
      recommendation = 'REJECT';
      reasons.push(`Leverage exceeds max (${config.trading.maxLeverage}x)`);
    }

    if (strategy.positionSize > config.trading.maxPositionSize) {
      recommendation = 'REJECT';
      reasons.push(`Position size exceeds max ($${config.trading.maxPositionSize})`);
    }

    const maxPositions = parseInt(process.env.MAX_CONCURRENT_POSITIONS || '4');
    if (currentPositions.length >= maxPositions) {
      recommendation = 'REJECT';
      reasons.push(`Maximum concurrent positions reached (${maxPositions})`);
    }

    // Check for duplicate symbol
    const hasDuplicate = currentPositions.some(p => p.symbol === strategy.symbol);
    if (hasDuplicate) {
      recommendation = 'REJECT';
      reasons.push(`Already have position for ${strategy.symbol}`);
    }

    if (recommendation === 'APPROVE') {
      reasons.push('All risk checks passed');
      reasons.push(`Total risk score: ${totalScore.toFixed(2)}/10`);
    }

    return {
      score: totalScore,
      factors,
      recommendation,
      reasons,
    };
  }

  /**
   * Calculate stop loss price
   */
  calculateStopLoss(entryPrice: number, side: 'LONG' | 'SHORT', percentage: number): number {
    if (side === 'LONG') {
      return entryPrice * (1 - percentage / 100);
    } else {
      return entryPrice * (1 + percentage / 100);
    }
  }

  /**
   * Calculate take profit price
   */
  calculateTakeProfit(entryPrice: number, side: 'LONG' | 'SHORT', percentage: number): number {
    if (side === 'LONG') {
      return entryPrice * (1 + percentage / 100);
    } else {
      return entryPrice * (1 - percentage / 100);
    }
  }

  /**
   * Calculate trailing stop loss
   */
  calculateTrailingStopLoss(
    currentPrice: number,
    entryPrice: number,
    side: 'LONG' | 'SHORT',
    trailingDistance: number
  ): number {
    if (side === 'LONG') {
      // For long positions, trail below current price
      return currentPrice * (1 - trailingDistance / 100);
    } else {
      // For short positions, trail above current price
      return currentPrice * (1 + trailingDistance / 100);
    }
  }

  /**
   * Check if stop loss should be triggered
   */
  shouldTriggerStopLoss(
    currentPrice: number,
    stopLoss: number,
    side: 'LONG' | 'SHORT'
  ): boolean {
    if (side === 'LONG') {
      return currentPrice <= stopLoss;
    } else {
      return currentPrice >= stopLoss;
    }
  }

  /**
   * Check if take profit should be triggered
   */
  shouldTriggerTakeProfit(
    currentPrice: number,
    takeProfit: number,
    side: 'LONG' | 'SHORT'
  ): boolean {
    if (side === 'LONG') {
      return currentPrice >= takeProfit;
    } else {
      return currentPrice <= takeProfit;
    }
  }

  /**
   * Calculate position P&L
   */
  calculatePnL(
    entryPrice: number,
    currentPrice: number,
    size: number,
    leverage: number,
    side: 'LONG' | 'SHORT'
  ): number {
    const priceChange = side === 'LONG'
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;

    return priceChange * leverage * 100; // Return as percentage
  }

  /**
   * Get current daily stats
   */
  getDailyStats(): { pnl: number; trades: number } {
    this.resetDailyCounters();
    return {
      pnl: this.dailyPnL,
      trades: this.dailyTrades,
    };
  }
}

export const riskManager = new RiskManager();

