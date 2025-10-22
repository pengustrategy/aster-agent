/**
 * BSC Blockchain Service
 * 
 * Handles wallet balance queries and blockchain interactions
 */

import { ethers } from 'ethers';
import { config } from '../config';

export class BSCService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.bsc.rpcUrl);
    
    if (config.bsc.privateKey) {
      this.wallet = new ethers.Wallet(config.bsc.privateKey, this.provider);
    }
  }

  /**
   * Get BNB balance
   */
  async getBNBBalance(address?: string): Promise<string> {
    try {
      const addr = address || this.wallet?.address;
      if (!addr) throw new Error('No address provided');

      const balance = await this.provider.getBalance(addr);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get BNB balance:', error);
      return '0';
    }
  }

  /**
   * Get USDT balance (BSC-USD: 0x55d398326f99059fF775485246999027B3197955)
   */
  async getUSDTBalance(address?: string): Promise<string> {
    try {
      const addr = address || this.wallet?.address;
      if (!addr) throw new Error('No address provided');

      const usdtAddress = '0x55d398326f99059fF775485246999027B3197955';
      const erc20ABI = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ];

      const contract = new ethers.Contract(usdtAddress, erc20ABI, this.provider);
      const balance = await contract.balanceOf(addr);
      const decimals = await contract.decimals();

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to get USDT balance:', error);
      return '0';
    }
  }

  /**
   * Get current gas price from BSC network
   */
  async getGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
      
      // BSC gas price typically 3-10 Gwei
      return parseFloat(gasPriceGwei) > 0 ? gasPriceGwei : '5';
    } catch (error) {
      console.error('Failed to get gas price:', error);
      return '5';
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get complete wallet info
   */
  async getWalletInfo(): Promise<any> {
    const address = this.wallet?.address;
    if (!address) {
      return {
        address: null,
        bnbBalance: '0',
        usdtBalance: '0',
        gasPrice: '0',
        connected: false,
      };
    }

    const [bnbBalance, usdtBalance, gasPrice] = await Promise.all([
      this.getBNBBalance(),
      this.getUSDTBalance(),
      this.getGasPrice(),
    ]);

    return {
      address,
      bnbBalance,
      usdtBalance,
      gasPrice,
      connected: true,
    };
  }
}

export const bscService = new BSCService();

