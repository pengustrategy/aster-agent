/**
 * Agent 3: Execution Engine
 * 
 * Responsibilities:
 * - Execute optimized trading strategy
 * - Place orders on Aster DEX
 * - Set up TP/SL orders
 * - Real-time WebSocket monitoring (every 5 seconds)
 * - Auto-trigger TP/SL when conditions met
 * - Trailing stop loss implementation
 */

import { claudeService } from '../services/claude.service';
import { asterService } from '../services/aster.service';
import { riskManager } from '../utils/risk-manager';
import type {
  Agent3Output,
  OptimizedStrategy,
  Position,
  Trade,
} from '../types';
import { OrderSide, OrderType } from '../types';
import { config } from '../config';

export class Agent3Executor {
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();
  private activePositions: Map<string, Position> = new Map();

  /**
   * Main execution function
   */
  async execute(strategy: OptimizedStrategy): Promise<Agent3Output> {
    console.log('\n🤖 === AGENT 3: Execution Engine Starting === 🤖\n');

    try {
      // Step 1: Get current BSC gas price
      console.log('⛽ Step 1: Checking BSC gas price...');
      const gasPrice = await this.getCurrentGasPrice();
      console.log(`✅ Gas Price: ${gasPrice} Gwei`);

      // Step 2: Generate execution plan with Claude
      console.log('\n🧠 Step 2: Generating execution plan...');
      const currentPrice = strategy.entryPrice; // In production, fetch real-time price
      const executionPlan = await claudeService.generateExecutionPlan({
        strategy,
        currentGasPrice: gasPrice,
        currentPrice,
      });

      console.log(`✅ Execution Plan: ${executionPlan.shouldExecute ? 'APPROVE' : 'REJECT'}`);

      if (!executionPlan.shouldExecute) {
        console.log('⚠️  Execution not recommended, aborting');
        return {
          executedTrades: [],
          monitoringStatus: {
            isActive: false,
            lastCheck: new Date(),
            slTriggered: false,
            tpTriggered: false,
          },
          performance: {
            realizedPnL: 0,
            unrealizedPnL: 0,
            totalPnL: 0,
            roi: 0,
          },
          timestamp: new Date(),
        };
      }

      // Step 3: Execute trade
      console.log('\n💼 Step 3: Executing trade on Aster DEX...');
      const executedTrades = await this.executeTrade(strategy, executionPlan);

      // Step 4: Set up TP/SL orders
      console.log('\n🛡️  Step 4: Setting up TP/SL orders...');
      await this.setupTPSL(strategy, executedTrades[0]);

      // Step 5: Start real-time monitoring
      console.log('\n👁️  Step 5: Starting WebSocket monitoring...');
      this.startMonitoring(strategy);

      console.log('\n✅ === AGENT 3: Execution Complete === ✅');
      console.log(`   Position opened: ${strategy.symbol}`);
      console.log(`   Side: ${strategy.side}`);
      console.log(`   Size: $${strategy.positionSize}`);
      console.log(`   Leverage: ${strategy.leverage}x`);
      console.log(`   Monitoring: ACTIVE (checking every 5 seconds)`);

      return {
        executedTrades,
        activePosition: this.activePositions.get(strategy.symbol),
        monitoringStatus: {
          isActive: true,
          lastCheck: new Date(),
          slTriggered: false,
          tpTriggered: false,
        },
        performance: {
          realizedPnL: 0,
          unrealizedPnL: 0,
          totalPnL: 0,
          roi: 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('\n❌ === AGENT 3: Error === ❌');
      console.error(error);
      throw error;
    }
  }

  /**
   * Execute the trade on Aster DEX
   */
  private async executeTrade(
    strategy: OptimizedStrategy,
    executionPlan: any
  ): Promise<Trade[]> {
    const trades: Trade[] = [];

    try {
      // Check for existing positions to avoid duplicate orders
      const asterService = new (await import('../services/aster.service')).AsterService();
      const existingPositions = await asterService.getPositions();
      const hasExistingPosition = existingPositions.some((pos: any) =>
        pos.symbol === strategy.symbol &&
        Math.abs(parseFloat(pos.positionAmt)) > 0
      );

      if (hasExistingPosition) {
        console.warn(`⚠️  已存在 ${strategy.symbol} 持仓，跳过新订单以避免重复交易`);
        throw new Error(`Already have position for ${strategy.symbol}, skipping to avoid duplicate orders`);
      }

      // Place main position order
      const orderParams: any = {
        symbol: strategy.symbol,
        side: strategy.side === 'LONG' ? 'BUY' : 'SELL',
        type: executionPlan.executionType || 'MARKET',
        quantity: this.calculateQuantity(strategy).toString(),
      };

      // Only add price and timeInForce for LIMIT orders
      if (executionPlan.executionType === 'LIMIT' && executionPlan.limitPrice) {
        orderParams.price = executionPlan.limitPrice.toString();
        orderParams.timeInForce = 'GTC';
      }

      const orderResponse = await asterService.createOrder(orderParams);

      const trade: Trade = {
        id: `trade_${Date.now()}`,
        orderId: orderResponse.orderId,
        symbol: strategy.symbol,
        side: strategy.side === 'LONG' ? OrderSide.BUY : OrderSide.SELL,
        type: executionPlan.executionType || OrderType.MARKET,
        price: strategy.entryPrice,
        quantity: this.calculateQuantity(strategy),
        status: 'FILLED',
        executedBy: 'agent3' as any,
        strategyId: strategy.id,
        timestamp: new Date(),
      };

      trades.push(trade);

      // Create position tracking
      const position: Position = {
        id: `pos_${Date.now()}`,
        symbol: strategy.symbol,
        side: strategy.side,
        entryPrice: strategy.entryPrice,
        currentPrice: strategy.entryPrice,
        size: strategy.positionSize,
        leverage: strategy.leverage,
        unrealizedPnL: 0,
        realizedPnL: 0,
        stopLoss: riskManager.calculateStopLoss(
          strategy.entryPrice,
          strategy.side,
          strategy.stopLoss.percentage
        ),
        takeProfit: riskManager.calculateTakeProfit(
          strategy.entryPrice,
          strategy.side,
          strategy.takeProfit.percentage
        ),
        isTrailingSL: strategy.stopLoss.type === 'TRAILING',
        openTime: new Date(),
        lastUpdateTime: new Date(),
      };

      this.activePositions.set(strategy.symbol, position);

      console.log(`✅ Trade executed: ${trade.orderId}`);
      return trades;
    } catch (error) {
      console.error('❌ Failed to execute trade:', error);
      throw error;
    }
  }

  /**
   * Set up TP/SL orders
   */
  private async setupTPSL(strategy: OptimizedStrategy, mainTrade: Trade): Promise<void> {
    try {
      // Place stop loss order
      const stopLossPrice = riskManager.calculateStopLoss(
        strategy.entryPrice,
        strategy.side,
        strategy.stopLoss.percentage
      );

      await asterService.createOrder({
        symbol: strategy.symbol,
        side: strategy.side === 'LONG' ? OrderSide.SELL : OrderSide.BUY,
        type: OrderType.STOP_MARKET,
        quantity: this.calculateQuantity(strategy).toString(),
        stopPrice: stopLossPrice.toString(),
        reduceOnly: true,
        timeInForce: 'GTC',
      });

      console.log(`✅ Stop Loss set at: $${stopLossPrice.toFixed(2)}`);

      // Place take profit order
      const takeProfitPrice = riskManager.calculateTakeProfit(
        strategy.entryPrice,
        strategy.side,
        strategy.takeProfit.percentage
      );

      await asterService.createOrder({
        symbol: strategy.symbol,
        side: strategy.side === 'LONG' ? OrderSide.SELL : OrderSide.BUY,
        type: OrderType.TAKE_PROFIT_MARKET,
        quantity: this.calculateQuantity(strategy).toString(),
        stopPrice: takeProfitPrice.toString(),
        reduceOnly: true,
        timeInForce: 'GTC',
      });

      console.log(`✅ Take Profit set at: $${takeProfitPrice.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Failed to setup TP/SL:', error);
      // Continue anyway - we'll monitor manually
    }
  }

  /**
   * Start real-time WebSocket monitoring
   */
  private startMonitoring(strategy: OptimizedStrategy): void {
    const { symbol } = strategy;

    // Connect to WebSocket if not already connected
    if (!asterService['ws']) {
      asterService.connectWebSocket();
    }

    // Subscribe to price updates
    asterService.subscribeToPrice(symbol, (currentPrice) => {
      this.onPriceUpdate(symbol, currentPrice);
    });

    // Also set up interval check (every 5 seconds)
    const intervalCheck = setInterval(() => {
      this.checkPositionStatus(symbol);
    }, config.agents.monitoringInterval);

    this.activeMonitoring.set(symbol, intervalCheck);

    console.log(`✅ Monitoring started for ${symbol} (every 5 seconds)`);
  }

  /**
   * Handle price updates from WebSocket
   */
  private onPriceUpdate(symbol: string, currentPrice: number): void {
    const position = this.activePositions.get(symbol);
    if (!position) return;

    // Update position
    position.currentPrice = currentPrice;
    position.lastUpdateTime = new Date();

    // Calculate unrealized P&L
    position.unrealizedPnL = riskManager.calculatePnL(
      position.entryPrice,
      currentPrice,
      position.size,
      position.leverage,
      position.side
    );

    // Check stop loss
    if (riskManager.shouldTriggerStopLoss(currentPrice, position.stopLoss, position.side)) {
      console.log(`\n🛑 STOP LOSS TRIGGERED for ${symbol} at $${currentPrice}`);
      this.closePosition(symbol, 'STOP_LOSS');
      return;
    }

    // Check take profit
    if (riskManager.shouldTriggerTakeProfit(currentPrice, position.takeProfit, position.side)) {
      console.log(`\n🎯 TAKE PROFIT TRIGGERED for ${symbol} at $${currentPrice}`);
      this.closePosition(symbol, 'TAKE_PROFIT');
      return;
    }

    // Update trailing stop loss if applicable
    if (position.isTrailingSL && position.unrealizedPnL > 5) {
      const newStopLoss = riskManager.calculateTrailingStopLoss(
        currentPrice,
        position.entryPrice,
        position.side,
        3 // 3% trailing distance
      );

      // Only update if new SL is better (tighter)
      if (position.side === 'LONG' && newStopLoss > position.stopLoss) {
        position.stopLoss = newStopLoss;
        console.log(`📈 Trailing SL updated: $${newStopLoss.toFixed(2)}`);
      } else if (position.side === 'SHORT' && newStopLoss < position.stopLoss) {
        position.stopLoss = newStopLoss;
        console.log(`📉 Trailing SL updated: $${newStopLoss.toFixed(2)}`);
      }
    }

    // Log every 30 seconds (6 intervals)
    const secondsSinceOpen = (Date.now() - position.openTime.getTime()) / 1000;
    if (secondsSinceOpen % 30 < 5) {
      console.log(`\n📊 ${symbol} Position Update:`);
      console.log(`   Price: $${currentPrice.toFixed(2)} (Entry: $${position.entryPrice.toFixed(2)})`);
      console.log(`   P&L: ${position.unrealizedPnL.toFixed(2)}%`);
      console.log(`   SL: $${position.stopLoss.toFixed(2)} | TP: $${position.takeProfit.toFixed(2)}`);
    }
  }

  /**
   * Check position status periodically
   */
  private async checkPositionStatus(symbol: string): Promise<void> {
    try {
      const positions = await asterService.getPositions();
      const asterPosition = positions.find(p => p.symbol === symbol);

      if (!asterPosition) {
        console.log(`⚠️  Position ${symbol} no longer exists on Aster, stopping monitor`);
        this.stopMonitoring(symbol);
      }
    } catch (error) {
      console.error(`❌ Failed to check position status for ${symbol}:`, error);
    }
  }

  /**
   * Close a position
   */
  private async closePosition(symbol: string, reason: string): Promise<void> {
    try {
      const position = this.activePositions.get(symbol);
      if (!position) return;

      console.log(`\n💼 Closing ${symbol} position (Reason: ${reason})`);

      // Close on Aster DEX
      await asterService.closePosition(
        symbol,
        position.side === 'LONG' ? 'LONG' : 'SHORT'
      );

      // Update daily P&L
      riskManager.updateDailyPnL(position.unrealizedPnL);

      console.log(`✅ Position closed`);
      console.log(`   Final P&L: ${position.unrealizedPnL.toFixed(2)}%`);
      console.log(`   Duration: ${Math.floor((Date.now() - position.openTime.getTime()) / 1000 / 60)} minutes`);

      // Stop monitoring
      this.stopMonitoring(symbol);

      // Remove position
      this.activePositions.delete(symbol);
    } catch (error) {
      console.error(`❌ Failed to close position ${symbol}:`, error);
    }
  }

  /**
   * Stop monitoring a symbol
   */
  private stopMonitoring(symbol: string): void {
    const intervalId = this.activeMonitoring.get(symbol);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeMonitoring.delete(symbol);
    }

    asterService.unsubscribeFromPrice(symbol);

    console.log(`✅ Monitoring stopped for ${symbol}`);
  }

  /**
   * Calculate order quantity based on position size and price
   */
  private calculateQuantity(strategy: OptimizedStrategy): number {
    // For futures trading: quantity = positionSize / entryPrice (NOT considering leverage in quantity)
    // The leverage is applied by the exchange, we just specify the base asset amount
    const notionalValue = strategy.positionSize; // e.g., $100
    const rawQuantity = notionalValue / strategy.entryPrice; // e.g., $100 / $107500 = 0.00093 BTC

    // BTCUSDT precision requirements from Aster DEX:
    // - Quantity Precision: 3 decimal places
    // - LOT_SIZE stepSize: 0.001
    // - MIN_NOTIONAL: 5 USDT
    const precision = strategy.symbol === 'BTCUSDT' ? 3 : 3;
    const stepSize = strategy.symbol === 'BTCUSDT' ? 0.001 : 0.001;
    const minQuantity = strategy.symbol === 'BTCUSDT' ? 0.001 : 0.001;

    // Round down to step size to avoid exceeding position size
    let roundedQuantity = Math.floor(rawQuantity / stepSize) * stepSize;

    // Ensure minimum quantity
    if (roundedQuantity < minQuantity) {
      roundedQuantity = minQuantity;
    }

    // Round to precision
    const finalQuantity = Math.round(roundedQuantity * Math.pow(10, precision)) / Math.pow(10, precision);

    // Calculate actual notional value for verification
    const actualNotional = finalQuantity * strategy.entryPrice;
    const leveragedExposure = actualNotional * strategy.leverage;

    console.log(`📊 Quantity calculation:
      Target Position Size: $${strategy.positionSize}
      Entry Price: $${strategy.entryPrice}
      Leverage: ${strategy.leverage}x
      Raw Quantity: ${rawQuantity.toFixed(6)} BTC
      Final Quantity: ${finalQuantity} BTC
      Actual Notional: $${actualNotional.toFixed(2)}
      Leveraged Exposure: $${leveragedExposure.toFixed(2)}`);

    return finalQuantity;
  }

  /**
   * Get current BSC gas price
   */
  private async getCurrentGasPrice(): Promise<number> {
    try {
      const axios = require('axios');
      const response = await axios.get('https://api.bscscan.com/api', {
        params: {
          module: 'gastracker',
          action: 'gasoracle',
        },
      });

      return parseFloat(response.data.result?.FastGasPrice || '5');
    } catch (error) {
      return 5; // Default 5 Gwei
    }
  }

  /**
   * Stop all monitoring
   */
  stopAllMonitoring(): void {
    this.activeMonitoring.forEach((intervalId, symbol) => {
      this.stopMonitoring(symbol);
    });
  }

  /**
   * Get all active positions
   */
  getActivePositions(): Position[] {
    return Array.from(this.activePositions.values());
  }
}

export const agent3 = new Agent3Executor();

