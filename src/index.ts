/**
 * Aster Trading Agents - Main Entry Point
 * 
 * Multi-agent automated trading system for Aster DEX on BSC network
 */

import express from 'express';
import { config, validateConfig } from './config';
import { orchestrator } from './orchestrator';
import { agent3 } from './agents/agent3-executor';
import { riskManager } from './utils/risk-manager';

const app = express();

app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// ==================== API Routes ====================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      claudeModel: config.claude.model,
      asterUrl: config.aster.restUrl,
      autoTradingEnabled: config.agents.autoTradingEnabled,
    },
  });
});

/**
 * Get system status
 */
app.get('/api/status', (req, res) => {
  try {
    const status = orchestrator.getStatus();
    const dailyStats = riskManager.getDailyStats();

    res.json({
      ...status,
      dailyStats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cache for positions to ensure stability
let positionsCache: any[] = [];
let lastPositionsUpdate = 0;

/**
 * Get active positions from Aster API with caching
 */
app.get('/api/positions', async (req, res) => {
  try {
    const { asterService } = await import('./services/aster.service');
    
    // Get real positions from Aster
    const asterPositions = await asterService.getPositions();
    
    console.log(`📊 Aster返回 ${asterPositions.length} 个持仓`);
    
    // Convert to our format
    const positions = asterPositions
      .filter((p: any) => {
        const posAmt = parseFloat(p.positionAmt || 0);
        console.log(`  ${p.symbol}: positionAmt=${posAmt}`);
        return posAmt !== 0;
      })
      .map((p: any) => {
        const positionAmt = parseFloat(p.positionAmt);
        const entryPrice = parseFloat(p.entryPrice);
        const markPrice = parseFloat(p.markPrice);
        const notional = parseFloat(p.notional || 0);
        
        // Calculate P&L percentage
        const pnlPercent = ((markPrice - entryPrice) / entryPrice) * 100 * (positionAmt > 0 ? 1 : -1);
        
        return {
          id: `pos_${p.symbol}_${Date.now()}`,
          symbol: p.symbol,
          side: positionAmt > 0 ? 'LONG' : 'SHORT',
          entryPrice: entryPrice,
          currentPrice: markPrice,
          size: Math.abs(notional) || Math.abs(positionAmt * markPrice),
          leverage: parseFloat(p.leverage || 1),
          unrealizedPnL: pnlPercent,
          realizedPnL: parseFloat(p.unRealizedProfit || 0),
          stopLoss: 0,
          takeProfit: 0,
          isTrailingSL: false,
          openTime: new Date(),
          lastUpdateTime: new Date(),
        };
      });

    // 更新缓存
    if (positions.length > 0) {
      positionsCache = positions;
      lastPositionsUpdate = Date.now();
      console.log(`✅ 持仓缓存已更新: ${positions.length}个`);
    } else if (positionsCache.length > 0 && Date.now() - lastPositionsUpdate < 60000) {
      // 如果API返回空但缓存仍在60秒内，使用缓存
      console.log(`⚠️ 使用缓存持仓数据: ${positionsCache.length}个`);
      res.json(positionsCache);
      return;
    }

    res.json(positions);
  } catch (error: any) {
    console.error('Failed to get positions:', error.message);
    // 返回缓存数据（如果有）
    if (positionsCache.length > 0 && Date.now() - lastPositionsUpdate < 60000) {
      console.log(`⚠️ API失败，使用缓存: ${positionsCache.length}个`);
      res.json(positionsCache);
    } else {
      res.json([]);
    }
  }
});

/**
 * Get conversation history
 */
app.get('/api/conversation', (req, res) => {
  try {
    const history = orchestrator.getConversationHistory();
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get wallet info with balances
 */
app.get('/api/wallet', async (req, res) => {
  try {
    const { bscService } = await import('./services/bsc.service');
    const walletInfo = await bscService.getWalletInfo();
    
    res.json({
      ...walletInfo,
      network: 'BSC Mainnet',
      chainId: config.bsc.chainId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get real-time ticker data from Aster API
 */
app.get('/api/tickers', async (req, res) => {
  try {
    const { asterService } = await import('./services/aster.service');
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    const tickers = await asterService.getMultipleTickers(symbols);
    res.json(tickers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start trading system
 */
app.post('/api/start', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT' } = req.body;
    await orchestrator.start(symbol);
    res.json({ success: true, message: 'System started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop trading system
 */
app.post('/api/stop', (req, res) => {
  try {
    orchestrator.stop();
    res.json({ success: true, message: 'System stopped' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run single cycle (for testing)
 */
app.post('/api/cycle', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT' } = req.body;
    await orchestrator.runCycle(symbol);
    res.json({ success: true, message: 'Cycle completed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Close a position manually
 */
app.post('/api/positions/:symbol/close', async (req, res) => {
  try {
    const { symbol } = req.params;
    // Implementation would call agent3 to close position
    res.json({ success: true, message: 'Position ' + symbol + ' closed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Main ====================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🤖 Aster Trading Agents System v1.0.0     ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  try {
    // Validate configuration
    console.log('🔍 Validating configuration...');
    validateConfig();

    // Start Express server
    const port = config.server.port;
    app.listen(port, () => {
      console.log('\n✅ API Server running on http://localhost:' + port);
      console.log('\n📡 Available endpoints:');
      console.log('   GET  http://localhost:' + port + '/api/health');
      console.log('   GET  http://localhost:' + port + '/api/status');
      console.log('   GET  http://localhost:' + port + '/api/positions');
      console.log('   GET  http://localhost:' + port + '/api/conversation');
      console.log('   POST http://localhost:' + port + '/api/start');
      console.log('   POST http://localhost:' + port + '/api/stop');
      console.log('   POST http://localhost:' + port + '/api/cycle');
      console.log('\n');
    });

    // Auto-start if enabled
    if (config.agents.autoTradingEnabled && !config.agents.manualApprovalRequired) {
      console.log('🚀 Auto-starting trading system...\n');
      await orchestrator.start('BTCUSDT');
    } else {
      console.log('⏸️  System ready. Call POST /api/start to begin trading.\n');
      console.log('   Current settings:');
      console.log('   - Auto Trading: ' + (config.agents.autoTradingEnabled ? 'ENABLED' : 'DISABLED'));
      console.log('   - Manual Approval: ' + (config.agents.manualApprovalRequired ? 'REQUIRED' : 'NOT REQUIRED') + '\n');
    }
  } catch (error) {
    console.error('\n❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  orchestrator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  orchestrator.stop();
  process.exit(0);
});

// Start the application
main();
