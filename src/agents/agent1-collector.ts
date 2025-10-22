/**
 * Agent 1: Data Collector & Strategy Provider
 * 
 * Responsibilities:
 * - Collect real-time market data from Aster DEX
 * - Monitor BSC on-chain metrics  
 * - Analyze news sentiment
 * - Generate initial trading strategy using Claude AI
 */

import { claudeService } from '../services/claude.service';
import { asterService } from '../services/aster.service';
import type { Agent1Output, TradingStrategy } from '../types';
import axios from 'axios';

export class Agent1Collector {
  /**
   * Main execution function
   */
  async execute(symbol: string = 'BTCUSDT'): Promise<Agent1Output> {
    console.log('\n🤖 === AGENT 1: Data Collector Starting === 🤖\n');

    try {
      // Step 1: Collect market data from Aster
      console.log('📊 Step 1: Fetching market data...');
      const marketData = await asterService.getMarketData(symbol);
      console.log(`✅ Market data collected: Price=$${marketData.price}, Volume=$${marketData.volume24h.toLocaleString()}`);

      // Step 2: Get BSC on-chain metrics
      console.log('\n⛓️  Step 2: Fetching BSC on-chain metrics...');
      const onChainMetrics = await this.getOnChainMetrics();
      console.log(`✅ On-chain metrics: Gas=${onChainMetrics.gasPrice} Gwei`);

      // Step 3: Analyze news sentiment
      console.log('\n📰 Step 3: Analyzing news sentiment...');
      const newsAnalysis = await this.analyzeNewsSentiment(symbol);
      console.log(`✅ Sentiment: ${newsAnalysis.sentiment > 0 ? 'Positive' : newsAnalysis.sentiment < 0 ? 'Negative' : 'Neutral'} (${newsAnalysis.sentiment.toFixed(2)})`);

      // Step 4: Generate strategy using Claude AI with trend confirmation
      console.log('\n🧠 Step 4: Generating trading strategy with Claude AI...');

      // Add trend analysis for better strategy generation
      const trendAnalysis = this.analyzeTrend(marketData);
      console.log(`📈 Trend Analysis: ${trendAnalysis.direction} (Strength: ${trendAnalysis.strength}/10)`);

      const initialStrategy = await claudeService.analyzeMarketAndGenerateStrategy({
        marketData,
        onChainMetrics,
        newsAnalysis,
        trendAnalysis, // Add trend context
      });

      console.log('\n✅ === AGENT 1: Strategy Generated === ✅');
      console.log(`   Symbol: ${initialStrategy.symbol}`);
      console.log(`   Side: ${initialStrategy.side}`);
      console.log(`   Entry: $${initialStrategy.entryPrice}`);
      console.log(`   Leverage: ${initialStrategy.leverage}x`);
      console.log(`   Size: $${initialStrategy.positionSize}`);
      console.log(`   Stop Loss: ${initialStrategy.stopLoss.percentage}%`);
      console.log(`   Take Profit: ${initialStrategy.takeProfit.percentage}%`);
      console.log(`   Confidence: ${initialStrategy.confidence}%`);
      console.log(`   Risk Score: ${initialStrategy.riskScore}/10`);

      return {
        marketData,
        onChainMetrics,
        newsAnalysis,
        initialStrategy,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('\n❌ === AGENT 1: Error === ❌');
      console.error(error);
      throw error;
    }
  }

  /**
   * Get BSC on-chain metrics
   */
  private async getOnChainMetrics(): Promise<any> {
    try {
      // Fetch current BSC gas price
      const gasResponse = await axios.get('https://api.bscscan.com/api', {
        params: {
          module: 'gastracker',
          action: 'gasoracle',
          apikey: 'YourApiKeyToken', // Replace with actual BSCScan API key if available
        },
      });

      const gasPrice = gasResponse.data.result?.FastGasPrice || 5;

      // Simulated liquidity depth and volume ratio
      // In production, fetch from The Graph or DeFi protocol APIs
      const liquidityDepth = Math.random() * 10000000 + 5000000; // $5M-$15M
      const volumeRatio = Math.random() * 0.5 + 0.3; // 0.3-0.8

      return {
        gasPrice: parseFloat(gasPrice),
        liquidityDepth,
        volumeRatio,
      };
    } catch (error) {
      console.warn('⚠️  Failed to fetch on-chain metrics, using defaults');
      return {
        gasPrice: 5,
        liquidityDepth: 8000000,
        volumeRatio: 0.5,
      };
    }
  }

  /**
   * Analyze news sentiment
   */
  private async analyzeNewsSentiment(symbol: string): Promise<any> {
    try {
      // Extract base symbol (BTC from BTCUSDT)
      const baseSymbol = symbol.replace('USDT', '').replace('USD', '');

      // Fetch from CoinGecko (or other news API)
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${baseSymbol.toLowerCase()}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: false,
        },
      });

      // Calculate sentiment from price change and social metrics
      const priceChange24h = response.data.market_data?.price_change_percentage_24h || 0;
      const sentimentVotesUp = response.data.sentiment_votes_up_percentage || 50;

      // Normalize sentiment to -1 to +1
      const priceSentiment = Math.max(-1, Math.min(1, priceChange24h / 10));
      const socialSentiment = (sentimentVotesUp - 50) / 50; // -1 to +1

      const overallSentiment = (priceSentiment * 0.6 + socialSentiment * 0.4);

      return {
        sentiment: overallSentiment,
        keywords: [
          'cryptocurrency',
          baseSymbol,
          priceChange24h > 0 ? 'bullish' : 'bearish',
          'trading',
        ],
        sources: ['CoinGecko', 'BSCScan'],
      };
    } catch (error) {
      console.warn('⚠️  Failed to fetch news sentiment, using neutral');
      return {
        sentiment: 0,
        keywords: ['cryptocurrency', 'trading'],
        sources: ['Default'],
      };
    }
  }

  /**
   * Analyze price trend to provide context for strategy generation
   */
  private analyzeTrend(marketData: any): { direction: string; strength: number; reasoning: string } {
    try {
      const price = parseFloat(marketData.price);
      const volume = parseFloat(marketData.volume);

      // Simple trend analysis based on price action
      // In production, this would use more sophisticated technical indicators
      const priceChange24h = parseFloat(marketData.priceChange24h || '0');
      const priceChangePercent = parseFloat(marketData.priceChangePercent24h || '0');

      let direction = 'SIDEWAYS';
      let strength = 5; // Default neutral
      let reasoning = 'Price action is neutral';

      if (Math.abs(priceChangePercent) > 2) {
        if (priceChangePercent > 0) {
          direction = 'BULLISH';
          strength = Math.min(10, 5 + Math.abs(priceChangePercent) / 2);
          reasoning = `Strong upward momentum: +${priceChangePercent.toFixed(2)}% in 24h`;
        } else {
          direction = 'BEARISH';
          strength = Math.min(10, 5 + Math.abs(priceChangePercent) / 2);
          reasoning = `Strong downward momentum: ${priceChangePercent.toFixed(2)}% in 24h`;
        }
      } else if (Math.abs(priceChangePercent) > 0.5) {
        direction = priceChangePercent > 0 ? 'SLIGHTLY_BULLISH' : 'SLIGHTLY_BEARISH';
        strength = 5 + Math.abs(priceChangePercent);
        reasoning = `Mild ${priceChangePercent > 0 ? 'upward' : 'downward'} trend: ${priceChangePercent.toFixed(2)}%`;
      }

      return {
        direction,
        strength: Math.round(strength),
        reasoning
      };
    } catch (error) {
      console.warn('⚠️  Failed to analyze trend, using neutral');
      return {
        direction: 'SIDEWAYS',
        strength: 5,
        reasoning: 'Unable to determine trend'
      };
    }
  }
}

export const agent1 = new Agent1Collector();

