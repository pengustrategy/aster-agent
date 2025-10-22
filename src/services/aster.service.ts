import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import WebSocket from 'ws';
import { config } from '../config';
import type { AsterOrder, AsterOrderResponse, AsterPosition, MarketData } from '../types';

export class AsterService {
  private restClient: AxiosInstance;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.restClient = axios.create({
      baseURL: config.aster.restUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Generate signature for authenticated requests according to Aster API docs
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', config.aster.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make authenticated API request according to Aster API docs
   */
  private async authenticatedRequest(
    method: string,
    path: string,
    params: any = {}
  ): Promise<any> {
    // Get server time for better synchronization
    let timestamp: number;
    try {
      const timeResponse = await this.restClient.get('/fapi/v1/time');
      timestamp = timeResponse.data.serverTime;
    } catch (error) {
      timestamp = Date.now();
    }

    const recvWindow = 5000;

    // Add required parameters
    const allParams = {
      ...params,
      recvWindow,
      timestamp,
    };

    // Create query string for signature (maintain parameter order, don't sort)
    const queryString = Object.entries(allParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const signature = this.generateSignature(queryString);

    try {
      let response;

      if (method.toUpperCase() === 'GET' || method.toUpperCase() === 'DELETE') {
        // For GET/DELETE, add signature to params
        const finalParams = { ...allParams, signature };
        response = await this.restClient.request({
          method,
          url: path,
          params: finalParams,
          headers: {
            'X-MBX-APIKEY': config.aster.apiKey,
          },
        });
      } else {
        // For POST/PUT, send as form data with signature
        const formData = new URLSearchParams();
        Object.keys(allParams).forEach(key => {
          formData.append(key, allParams[key]);
        });
        formData.append('signature', signature);

        response = await this.restClient.request({
          method,
          url: path,
          data: formData.toString(),
          headers: {
            'X-MBX-APIKEY': config.aster.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Aster API error:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get market data for a symbol from Aster API
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Use correct Aster API endpoints according to docs
      const ticker = await this.restClient.get(`/fapi/v1/ticker/24hr`, {
        params: { symbol }
      });

      const markPrice = await this.restClient.get(`/fapi/v1/premiumIndex`, {
        params: { symbol }
      });

      const fundingRate = await this.restClient.get(`/fapi/v1/fundingRate`, {
        params: { symbol, limit: 1 }
      });

      return {
        symbol,
        price: parseFloat(ticker.data.lastPrice || ticker.data.price),
        volume24h: parseFloat(ticker.data.volume),
        openInterest: parseFloat(ticker.data.openInterest || '0'),
        fundingRate: parseFloat(fundingRate.data[0]?.fundingRate || '0'),
        indexPrice: parseFloat(markPrice.data.indexPrice || ticker.data.lastPrice),
        markPrice: parseFloat(markPrice.data.markPrice || ticker.data.lastPrice),
        lastUpdateTime: new Date(),
      };
    } catch (error) {
      console.error(`❌ Failed to get market data for ${symbol}:`, error);
      // Return mock data for development
      return {
        symbol,
        price: 65000 + Math.random() * 1000,
        volume24h: 1000000 + Math.random() * 500000,
        openInterest: 500000 + Math.random() * 100000,
        fundingRate: 0.0001 + Math.random() * 0.0002,
        indexPrice: 65000 + Math.random() * 1000,
        markPrice: 65000 + Math.random() * 1000,
        lastUpdateTime: new Date(),
      };
    }
  }

  /**
   * Get all available symbols from Aster
   */
  async getAllSymbols(): Promise<string[]> {
    try {
      const response = await this.restClient.get('/fapi/v1/exchangeInfo');
      const symbols = response.data.symbols
        ?.filter((s: any) => s.status === 'TRADING')
        ?.map((s: any) => s.symbol) || [];

      return symbols.length > 0 ? symbols : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    } catch (error) {
      console.error('❌ Failed to get symbols:', error);
      // Return default symbols
      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    }
  }

  /**
   * Get ticker data for multiple symbols
   */
  async getMultipleTickers(symbols: string[]): Promise<any> {
    try {
      // Use 24hr ticker endpoint for all symbols
      const response = await this.restClient.get('/fapi/v1/ticker/24hr');
      const allTickers = response.data;

      const tickers: any = {};
      symbols.forEach(symbol => {
        const ticker = allTickers.find((t: any) => t.symbol === symbol);
        if (ticker) {
          const baseSymbol = symbol.replace('USDT', '');
          tickers[baseSymbol] = {
            price: parseFloat(ticker.lastPrice),
            change: parseFloat(ticker.priceChangePercent || 0),
            volume: parseFloat(ticker.volume),
            high: parseFloat(ticker.highPrice),
            low: parseFloat(ticker.lowPrice),
          };
        } else {
          // Fallback mock data
          const baseSymbol = symbol.replace('USDT', '');
          const basePrice = baseSymbol === 'BTC' ? 65000 :
                           baseSymbol === 'ETH' ? 3500 :
                           baseSymbol === 'SOL' ? 150 : 600;
          tickers[baseSymbol] = {
            price: basePrice + Math.random() * basePrice * 0.02,
            change: (Math.random() - 0.5) * 10,
            volume: 1000000 + Math.random() * 500000,
            high: basePrice * 1.05,
            low: basePrice * 0.95,
          };
        }
      });

      return tickers;
    } catch (error) {
      console.error('❌ Failed to get multiple tickers:', error);
      // Return mock data for development
      const tickers: any = {};
      symbols.forEach(symbol => {
        const baseSymbol = symbol.replace('USDT', '');
        const basePrice = baseSymbol === 'BTC' ? 65000 :
                         baseSymbol === 'ETH' ? 3500 :
                         baseSymbol === 'SOL' ? 150 : 600;
        tickers[baseSymbol] = {
          price: basePrice + Math.random() * basePrice * 0.02,
          change: (Math.random() - 0.5) * 10,
          volume: 1000000 + Math.random() * 500000,
          high: basePrice * 1.05,
          low: basePrice * 0.95,
        };
      });
      return tickers;
    }
  }

  /**
   * Create a new order
   */
  async createOrder(order: AsterOrder): Promise<AsterOrderResponse> {
    console.log('📤 Placing order on Aster DEX:', order);

    // Convert order to Aster API format
    const orderParams: any = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      ...(order.price && { price: order.price }),
      ...(order.stopPrice && { stopPrice: order.stopPrice }),
      ...(order.timeInForce && { timeInForce: order.timeInForce }),
      ...(order.reduceOnly && { reduceOnly: order.reduceOnly }),
      ...(order.postOnly && { postOnly: order.postOnly }),
    };

    try {
      const response = await this.authenticatedRequest('POST', '/fapi/v1/order', orderParams);
      console.log('✅ Order placed successfully:', response.orderId);
      return response;
    } catch (error: any) {
      if (error.response?.data?.code === -2019) {
        console.warn('⚠️  Insufficient margin detected - checking account balance');

        try {
          // Get current account info to check available balance
          const accountInfo = await this.getAccountInfo();
          const availableBalance = parseFloat(accountInfo?.availableBalance || '0');
          const totalBalance = parseFloat(accountInfo?.totalWalletBalance || '0');

          console.log(`💰 Account Balance: Available: $${availableBalance}, Total: $${totalBalance}`);

          // Check if we have sufficient balance for trading
          if (availableBalance < 20) {
            throw new Error(`余额不足：当前可用余额 $${availableBalance}，建议至少 $50 以确保正常交易`);
          }

          // Try with minimum order size first
          const originalQuantity = orderParams.quantity;
          orderParams.quantity = '0.001';

          console.log(`🔄 使用最小订单数量重试: ${orderParams.quantity} (原始: ${originalQuantity})`);
          const response = await this.authenticatedRequest('POST', '/fapi/v1/order', orderParams);
          console.log('✅ 最小数量订单下单成功:', response.orderId);
          return response;

        } catch (marginError: any) {
          console.error('❌ 保证金不足，无法下单:', marginError.message);
          throw new Error(`保证金不足: ${marginError.message}`);
        }
      } else if (error.response?.data?.code === -1111) {
        console.warn('⚠️  Price precision error - adjusting precision and retrying');
        // Handle precision errors by rounding prices appropriately
        if (orderParams.price) {
          orderParams.price = parseFloat(orderParams.price.toString()).toFixed(2);
        }
        if (orderParams.stopPrice) {
          orderParams.stopPrice = parseFloat(orderParams.stopPrice.toString()).toFixed(2);
        }

        // Retry with adjusted precision
        try {
          const response = await this.authenticatedRequest('POST', '/fapi/v1/order', orderParams);
          console.log('✅ Order placed successfully after precision adjustment:', response.orderId);
          return response;
        } catch (retryError: any) {
          console.error('❌ Failed to create order even after precision adjustment:', retryError);
          throw retryError;
        }
      }
      console.error('❌ Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Get current positions
   */
  async getPositions(): Promise<AsterPosition[]> {
    try {
      const response = await this.authenticatedRequest('GET', '/fapi/v2/positionRisk');
      return response || [];
    } catch (error: any) {
      console.error('❌ Failed to get positions:', error.response?.data?.msg || error.message);
      return [];
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<any> {
    try {
      const response = await this.authenticatedRequest('GET', '/fapi/v2/balance');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to get balance:', error.response?.data?.msg || error.message);
      return [];
    }
  }

  /**
   * Get futures account information including margin balance
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.authenticatedRequest('GET', '/fapi/v2/account');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to get account info:', error.response?.data?.msg || error.message);
      return null;
    }
  }

  // Removed spot-related methods as we're focusing on futures trading only

  /**
   * Close a position
   */
  async closePosition(symbol: string, side: 'LONG' | 'SHORT'): Promise<AsterOrderResponse> {
    console.log(`📤 Closing ${side} position for ${symbol}`);

    try {
      const response = await this.authenticatedRequest('POST', '/fapi/v1/order', {
        symbol,
        side: side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        reduceOnly: true,
      });

      console.log('✅ Position closed successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to close position:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    try {
      await this.authenticatedRequest('DELETE', '/fapi/v1/order', {
        symbol,
        orderId,
      });
      console.log('✅ Order cancelled:', orderId);
    } catch (error) {
      console.error('❌ Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket for real-time data
   */
  connectWebSocket(onConnect?: () => void): void {
    if (this.ws) {
      console.warn('⚠️  WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to Aster WebSocket...');

    // Use the correct WebSocket URL for market streams
    const wsUrl = `${config.aster.wsUrl}/ws/!ticker@arr`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('✅ WebSocket connected to Aster');
      onConnect?.();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle different message formats
        if (Array.isArray(message)) {
          // All market tickers
          message.forEach((ticker: any) => {
            const handler = this.subscriptions.get(`ticker.${ticker.s}`);
            if (handler) {
              handler(parseFloat(ticker.c)); // c = close price
            }
          });
        } else if (message.stream && message.data) {
          // Individual stream
          const streamName = message.stream;
          const handler = this.subscriptions.get(streamName);
          if (handler) {
            handler(message.data);
          }
        }
      } catch (error) {
        console.error('❌ WebSocket message parse error:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
      this.ws = null;
      // Auto-reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    });
  }

  /**
   * Subscribe to price updates
   */
  subscribeToPrice(symbol: string, callback: (price: number) => void): void {
    const channel = `ticker.${symbol}`;

    this.subscriptions.set(channel, callback);

    // For individual symbol subscription, we need a separate WebSocket connection
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connectWebSocket(() => {
        console.log(`📊 Subscribed to ${symbol} price updates`);
      });
    } else {
      console.log(`📊 Subscribed to ${symbol} price updates`);
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPrice(symbol: string): void {
    const channel = `ticker.${symbol}`;
    this.subscriptions.delete(channel);
    console.log(`📊 Unsubscribed from ${symbol} price updates`);
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.subscriptions.clear();
      console.log('🔌 WebSocket disconnected');
    }
  }
}

export const asterService = new AsterService();

