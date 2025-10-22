import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import type { MarketData, TradingStrategy, OptimizedStrategy } from '../types';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
    });
  }

  /**
   * Agent 1: Analyze market data and generate initial strategy
   */
  async analyzeMarketAndGenerateStrategy(data: {
    marketData: MarketData;
    onChainMetrics: any;
    newsAnalysis: any;
    trendAnalysis?: any;
  }): Promise<TradingStrategy> {
    const prompt = `
You are Agent 1: Market Analyst & Strategy Planner for Aster DEX.

Your task is to analyze the market deeply and create a detailed trading plan.

# Current Market Data

Symbol: ${data.marketData.symbol}
Price: $${data.marketData.price}
24h Volume: $${data.marketData.volume24h.toLocaleString()}
Open Interest: $${data.marketData.openInterest.toLocaleString()}
Funding Rate: ${(data.marketData.fundingRate * 100).toFixed(4)}%
News Sentiment: ${data.newsAnalysis.sentiment > 0 ? 'Bullish' : data.newsAnalysis.sentiment < 0 ? 'Bearish' : 'Neutral'}
${data.trendAnalysis ? `Trend Analysis: ${data.trendAnalysis.direction} (Strength: ${data.trendAnalysis.strength}/10)
Trend Reasoning: ${data.trendAnalysis.reasoning}` : ''}

# Your Analysis Task

1. ANALYZE THE TREND: Study the price action, volume, and funding rate
2. ANALYZE THE NEWS: Consider market sentiment and news impact  
3. FORMULATE YOUR PLAN: Create a detailed trading strategy

Write your analysis in a conversational, analytical style. Think like a professional trader.

Provide your response in JSON format:
{
  "side": "LONG" or "SHORT",
  "entryPrice": number,
  "entryCondition": "when to enter",
  "leverage": number (1-10),
  "positionSize": number (in USD),
  "stopLossPercentage": number (2-5%),
  "takeProfitPercentage": number (5-10%),
  "reasoning": "Write 3-5 sentences explaining: 1) What you see in the charts and trends 2) Why this direction makes sense 3) Your complete trading plan with entry, stop loss, and take profit levels. Be specific and analytical, like talking to a trading partner.",
  "confidence": number (0-100),
  "riskScore": number (0-10)
}

IMPORTANT: The "reasoning" field should be your detailed analysis and trading plan in natural language, NOT just listing data points. Explain your thought process like a professional trader would.

Example reasoning: "Looking at the 4-hour chart, BTC is forming a bullish ascending triangle pattern with strong support at $64,500. The funding rate is neutral at 0.01%, indicating balanced market sentiment. News flow is positive with institutional buying. My plan: Enter LONG at $65,000 with 5x leverage, targeting $68,900 (+6%) based on Fibonacci extension. Stop loss at $63,050 (-3%) below key support. Risk/reward ratio is 2:1."

Return ONLY valid JSON, no additional text.
`;

    try {
      const response = await this.client.messages.create({
        model: config.claude.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      let strategyData;
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Claude response');
        }
        strategyData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('⚠️  Failed to parse Claude response, using fallback strategy');
        // Fallback strategy based on market data
        strategyData = {
          side: data.marketData.fundingRate > 0 ? 'LONG' : 'SHORT',
          entryPrice: data.marketData.price,
          entryCondition: 'Market entry based on current conditions',
          leverage: 5,
          positionSize: 100,
          stopLossPercentage: 3,
          takeProfitPercentage: 6,
          reasoning: 'Fallback strategy generated due to Claude API parsing issue',
          confidence: 60,
          riskScore: 5,
        };
      }

      // Build full strategy object
      const strategy: TradingStrategy = {
        id: `strat_${Date.now()}`,
        symbol: data.marketData.symbol,
        side: strategyData.side,
        entryPrice: strategyData.entryPrice,
        entryCondition: strategyData.entryCondition,
        leverage: Math.min(strategyData.leverage, config.trading.maxLeverage),
        positionSize: Math.min(strategyData.positionSize, config.trading.maxPositionSize),
        stopLoss: {
          type: 'FIXED',
          percentage: strategyData.stopLossPercentage,
        },
        takeProfit: {
          type: 'FIXED',
          percentage: strategyData.takeProfitPercentage,
        },
        reasoning: strategyData.reasoning,
        confidence: strategyData.confidence,
        riskScore: strategyData.riskScore,
        createdBy: 'agent1' as any,
        timestamp: new Date(),
      };

      console.log('✅ Agent 1 strategy generated:', strategy.id);
      return strategy;
    } catch (error) {
      console.error('❌ Claude API error (Agent 1):', error);
      throw error;
    }
  }

  /**
   * Agent 2: Optimize strategy with risk assessment
   */
  async optimizeStrategy(data: {
    initialStrategy: TradingStrategy;
    historicalPerformance?: any;
    currentPositions: any[];
  }): Promise<OptimizedStrategy> {
    const prompt = `
You are Agent 2: Risk Manager & Strategy Optimizer for Aster DEX.

Agent 1 has proposed a trading strategy. Your job is to review it critically and optimize for risk/reward.

# Agent 1's Proposal

Direction: ${data.initialStrategy.side}
Entry: $${data.initialStrategy.entryPrice}
Size: $${data.initialStrategy.positionSize}
Leverage: ${data.initialStrategy.leverage}x
Stop Loss: ${data.initialStrategy.stopLoss.percentage}%
Take Profit: ${data.initialStrategy.takeProfit.percentage}%

Agent 1's Analysis:
"${data.initialStrategy.reasoning}"

Current Open Positions: ${data.currentPositions.length}

# Your Optimization Task

Review Agent 1's plan and provide your professional optimization:

Provide your response in JSON format:
{
  "keepOriginal": boolean,
  "optimizations": {
    "entryPrice": number,
    "leverage": number (1-10),
    "positionSize": number,
    "stopLoss": {
      "type": "FIXED" | "TRAILING",
      "percentage": number,
      "trailingDistance": number (if trailing)
    },
    "takeProfit": {
      "type": "FIXED",
      "percentage": number
    }
  },
  "riskAssessment": {
    "score": number (0-10),
    "recommendation": "APPROVE" | "REJECT" | "REDUCE_SIZE",
    "reasons": ["reason1", "reason2", ...]
  },
  "optimizationReasoning": "Write 3-5 sentences explaining: 1) Your assessment of Agent 1's plan 2) What adjustments you made and why 3) Your risk management rationale 4) Why you approve/reject this trade. Be professional and analytical.",
  "improvements": ["improvement1", "improvement2"],
  "expectedWinRate": number (0-100),
  "expectedRiskReward": number
}

IMPORTANT: The "optimizationReasoning" should explain your thinking process like you're advising a trading team.

Example: "Agent 1's SHORT proposal looks solid given the bearish momentum. However, I'm reducing leverage from 5x to 3x due to high volatility. The 3% stop loss is appropriate below recent support. I'm tightening the take profit to 6% for quicker profit-taking in this choppy market. Risk score is 4.6/10 - moderate and acceptable. I APPROVE this trade with my adjustments."

Return ONLY valid JSON.
`;

    try {
      const response = await this.client.messages.create({
        model: config.claude.model,
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const optimizationData = JSON.parse(jsonMatch[0]);

      const optimizedStrategy: OptimizedStrategy = {
        ...data.initialStrategy,
        id: `opt_${Date.now()}`,
        entryPrice: optimizationData.optimizations.entryPrice,
        leverage: optimizationData.optimizations.leverage,
        positionSize: optimizationData.optimizations.positionSize,
        stopLoss: optimizationData.optimizations.stopLoss,
        takeProfit: optimizationData.optimizations.takeProfit,
        optimizedBy: 'agent2' as any,
        riskAdjustments: optimizationData.improvements,
        backtestResults: {
          winRate: optimizationData.expectedWinRate,
          profitFactor: optimizationData.expectedRiskReward,
          maxDrawdown: 0,
          sharpeRatio: 0,
          totalTrades: 0,
        },
      };

      console.log('✅ Agent 2 optimization complete:', optimizedStrategy.id);
      console.log(`   Recommendation: ${optimizationData.riskAssessment.recommendation}`);
      console.log(`   Reasoning: ${optimizationData.optimizationReasoning?.substring(0, 100)}...`);

      return optimizedStrategy;
    } catch (error) {
      console.error('❌ Claude API error (Agent 2):', error);
      throw error;
    }
  }

  /**
   * Agent 3: Generate execution plan
   */
  async generateExecutionPlan(data: {
    strategy: OptimizedStrategy;
    currentGasPrice: number;
    currentPrice: number;
  }): Promise<any> {
    const prompt = `
You are Agent 3: Execution Engine for Aster DEX automated trading.

# Strategy to Execute

**Symbol**: ${data.strategy.symbol}
**Side**: ${data.strategy.side}
**Entry Price**: $${data.strategy.entryPrice}
**Current Price**: $${data.currentPrice}
**Leverage**: ${data.strategy.leverage}x
**Position Size**: $${data.strategy.positionSize} USD
**Stop Loss**: ${JSON.stringify(data.strategy.stopLoss)}
**Take Profit**: ${JSON.stringify(data.strategy.takeProfit)}

**Current Gas Price**: ${data.currentGasPrice} Gwei

# Task

Generate a detailed execution plan for this trade on Aster DEX (BSC network).

Provide your response in JSON format:
{
  "shouldExecute": boolean,
  "executionType": "MARKET" | "LIMIT",
  "limitPrice": number (if limit order),
  "slippageTolerance": number (0.5-2%),
  "gasOptimization": {
    "useHighPriority": boolean,
    "maxGasPrice": number (in Gwei)
  },
  "orderSequence": [
    {"step": 1, "action": "Open position", "orderType": "MARKET"},
    {"step": 2, "action": "Set stop loss", "orderType": "STOP_LOSS_LIMIT"},
    {"step": 3, "action": "Set take profit", "orderType": "TAKE_PROFIT_LIMIT"}
  ],
  "monitoringConfig": {
    "checkInterval": 5,
    "enableTrailingStop": boolean,
    "trailingActivationProfit": number (% profit to activate trailing)
  },
  "contingencyPlans": [
    {"scenario": "High slippage", "action": "Cancel and retry with limit"},
    ...
  ],
  "warnings": ["warning1", ...],
  "estimatedCosts": {
    "gasCost": number (in USD),
    "tradingFees": number (in USD),
    "totalCost": number
  }
}

Execution Considerations:
1. BSC gas prices can spike - set max gas limit
2. Aster DEX charges 0.05% taker fee, 0.02% maker fee
3. Use limit orders during high volatility
4. Stop loss should be placed immediately after position opens
5. Monitor funding rate for overnight positions
6. Set up WebSocket monitoring for price alerts

Return ONLY valid JSON, no additional text.
`;

    try {
      const response = await this.client.messages.create({
        model: config.claude.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const executionPlan = JSON.parse(jsonMatch[0]);

      console.log('✅ Agent 3 execution plan generated');
      console.log(`   Should Execute: ${executionPlan.shouldExecute}`);

      return executionPlan;
    } catch (error) {
      console.error('❌ Claude API error (Agent 3):', error);
      throw error;
    }
  }
}

export const claudeService = new ClaudeService();

