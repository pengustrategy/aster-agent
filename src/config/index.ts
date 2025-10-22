import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Claude AI
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  },

  // Aster DEX
  aster: {
    apiKey: process.env.ASTER_API_KEY || '',
    apiSecret: process.env.ASTER_API_SECRET || '',
    restUrl: process.env.ASTER_REST_URL || 'https://fapi.asterdex.com',
    wsUrl: process.env.ASTER_WS_URL || 'wss://fstream.asterdex.com',
  },

  // BSC Network
  bsc: {
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
    chainId: parseInt(process.env.BSC_CHAIN_ID || '56'),
    walletAddress: process.env.TRADING_WALLET_ADDRESS || '',
    privateKey: process.env.TRADING_WALLET_PRIVATE_KEY || '',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Trading parameters - Optimized for better risk management
  trading: {
    maxConcurrentPositions: parseInt(process.env.MAX_CONCURRENT_POSITIONS || '3'), // Reduced from 4
    positionSizePercent: parseFloat(process.env.POSITION_SIZE_PERCENT || '20'), // Increased from 10%
    maxLeverage: parseInt(process.env.MAX_LEVERAGE || '5'), // Reduced from 10x for safety
    maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '100'), // Increased from $50
    defaultStopLoss: parseFloat(process.env.DEFAULT_STOP_LOSS || '2'), // Tighter stop loss
    defaultTakeProfit: parseFloat(process.env.DEFAULT_TAKE_PROFIT || '4'), // More conservative TP
    maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '3'), // Reduced daily loss limit
    slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5'), // Tighter slippage
    allowedSymbols: (process.env.ALLOWED_SYMBOLS || 'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT').split(','),
  },

  // Agent settings
  agents: {
    cycleInterval: parseInt(process.env.AGENT_CYCLE_INTERVAL || '5') * 60 * 1000, // Convert to ms
    autoTradingEnabled: process.env.AUTO_TRADING_ENABLED === 'true',
    manualApprovalRequired: process.env.MANUAL_APPROVAL_REQUIRED !== 'false',
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL || '5') * 1000, // 5 seconds default
  },

  // Monitoring
  monitoring: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    enableAlerts: process.env.ENABLE_ALERTS === 'true',
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '3001'),
    frontendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

// Validation
export function validateConfig() {
  const required = [
    ['ANTHROPIC_API_KEY', config.claude.apiKey],
    ['ASTER_API_KEY', config.aster.apiKey],
    ['ASTER_API_SECRET', config.aster.apiSecret],
  ];

  const missing = required.filter(([key, value]) => !value);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(([key]) => console.error(`  - ${key}`));
    throw new Error('Configuration validation failed');
  }

  console.log('✅ Configuration validated successfully');
}

