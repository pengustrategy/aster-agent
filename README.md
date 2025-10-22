# 🤖 Aster Trading Agent

AI-Powered Multi-Agent Automated Trading System for Aster DEX on BSC Network.

## Features

- 🤖 **Three-Agent System**: Data Collector, Strategy Optimizer, Execution Engine
- 🧠 **Claude 4.5 Sonnet AI**: Intelligent market analysis and strategy generation
- 📊 **Real-time Trading**: Automated execution on Aster DEX
- 🛡️ **Smart Risk Management**: Position limits, stop-loss, take-profit
- 📈 **Live Monitoring**: WebSocket real-time position tracking
- 💼 **Wallet Integration**: BSC network with BNB and USDT support
- 📚 **Persistent History**: All conversations and trades saved

## Trading Rules

- **Position Size**: 20% of wallet per trade
- **Max Positions**: 3 concurrent (one per symbol)
- **Allowed Symbols**: BTC, ETH, BNB, SOL only
- **Max Leverage**: 5x
- **Stop Loss**: 2%
- **Take Profit**: 4%
- **Daily Loss Limit**: 3%

## Quick Start

### Prerequisites

- Node.js 18+
- BSC wallet with BNB and USDT
- Claude API key
- Aster DEX API key

### Installation

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your keys

# Start backend
npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### Access

- Dashboard: http://localhost:3000
- API: http://localhost:3001

## Deployment

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for production deployment guide.

## Security

⚠️ **IMPORTANT**: 
- Never commit `.env` files
- Keep private keys secure
- Use environment variables on deployment platforms
- Cryptocurrency trading involves risk

## License

MIT

---

Built with ❤️ using Claude AI, Aster DEX, and BSC

