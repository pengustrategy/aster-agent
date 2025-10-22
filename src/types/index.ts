/**
 * Core Type Definitions for Aster Trading Agents
 */

// ==================== Agent Types ====================

export enum AgentType {
  COLLECTOR = 'agent1',
  OPTIMIZER = 'agent2',
  EXECUTOR = 'agent3'
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  WAITING = 'waiting'
}

export interface AgentMessage {
  agent: AgentType;
  timestamp: Date;
  status: AgentStatus;
  data: any;
  nextAgent?: AgentType;
  error?: string;
}

// ==================== Trading Types ====================

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
  STOP_MARKET = 'STOP_MARKET',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET'
}

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  indexPrice: number;
  markPrice: number;
  lastUpdateTime: Date;
}

export interface TradingStrategy {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  entryCondition: string;
  leverage: number;
  positionSize: number; // in USD
  stopLoss: StopLossConfig;
  takeProfit: TakeProfitConfig;
  reasoning: string;
  confidence: number; // 0-100
  riskScore: number; // 0-10
  createdBy: AgentType;
  timestamp: Date;
}

export interface StopLossConfig {
  type: 'FIXED' | 'TRAILING' | 'ATR_BASED';
  percentage: number; // e.g., 4 = 4%
  price?: number;
  trailingDistance?: number; // For trailing SL
  atrMultiplier?: number; // For ATR-based SL
}

export interface TakeProfitConfig {
  type: 'FIXED' | 'PARTIAL';
  percentage: number; // e.g., 8 = 8%
  price?: number;
  partialExits?: Array<{ percentage: number; profitLevel: number }>;
}

export interface OptimizedStrategy extends TradingStrategy {
  optimizedBy: AgentType.OPTIMIZER;
  backtestResults?: BacktestResult;
  riskAdjustments: string[];
  alternativeStrategies?: TradingStrategy[];
}

export interface BacktestResult {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLoss: number;
  takeProfit: number;
  isTrailingSL: boolean;
  openTime: Date;
  lastUpdateTime: Date;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  executedBy: AgentType;
  strategyId: string;
  timestamp: Date;
  txHash?: string;
  gasUsed?: number;
}

// ==================== Aster API Types ====================

export interface AsterOrder {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number | string;
  price?: number | string;
  stopPrice?: number | string;
  leverage?: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface AsterOrderResponse {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  status: string;
  timestamp: number;
}

export interface AsterPosition {
  symbol: string;
  side: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  leverage: number;
  margin: number;
}

// ==================== Risk Management ====================

export interface RiskLimits {
  maxLeverage: number;
  maxPositionSize: number; // USD
  maxDailyLoss: number; // percentage
  maxDrawdown: number; // percentage
  slippageTolerance: number; // percentage
}

export interface RiskAssessment {
  score: number; // 0-10 (10 = highest risk)
  factors: Array<{
    name: string;
    value: number;
    weight: number;
  }>;
  recommendation: 'APPROVE' | 'REJECT' | 'REDUCE_SIZE';
  reasons: string[];
}

// ==================== Agent Communication ====================

export interface Agent1Output {
  marketData: MarketData;
  onChainMetrics: {
    gasPrice: number;
    liquidityDepth: number;
    volumeRatio: number;
  };
  newsAnalysis: {
    sentiment: number; // -1 to 1
    keywords: string[];
    sources: string[];
  };
  initialStrategy: TradingStrategy;
  timestamp: Date;
}

export interface Agent2Output {
  optimizedStrategy: OptimizedStrategy;
  riskAssessment: RiskAssessment;
  tpSlConfig: {
    stopLoss: StopLossConfig;
    takeProfit: TakeProfitConfig;
  };
  backtestResults?: BacktestResult;
  alternatives: TradingStrategy[];
  timestamp: Date;
}

export interface Agent3Output {
  executedTrades: Trade[];
  activePosition?: Position;
  monitoringStatus: {
    isActive: boolean;
    lastCheck: Date;
    slTriggered: boolean;
    tpTriggered: boolean;
  };
  performance: {
    realizedPnL: number;
    unrealizedPnL: number;
    totalPnL: number;
    roi: number;
  };
  timestamp: Date;
}

// ==================== Configuration ====================

export interface SystemConfig {
  trading: {
    symbols: string[];
    maxConcurrentPositions: number;
    riskLimits: RiskLimits;
  };
  agents: {
    cycleInterval: number; // minutes
    autoTradingEnabled: boolean;
    manualApprovalRequired: boolean;
  };
  monitoring: {
    checkInterval: number; // seconds
    alertThresholds: {
      pnlPercent: number;
      gasPrice: number;
    };
  };
}

// ==================== Database Models ====================

export interface DBStrategy {
  id: string;
  symbol: string;
  side: string;
  entryPrice: number;
  leverage: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  confidence: number;
  riskScore: number;
  createdBy: string;
  createdAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
}

export interface DBTrade {
  id: string;
  strategyId: string;
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: number;
  quantity: number;
  status: string;
  executedBy: string;
  txHash?: string;
  gasUsed?: number;
  createdAt: Date;
  executedAt?: Date;
}

export interface DBPerformance {
  id: string;
  date: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

