<img width="2940" height="770" alt="image" src="https://github.com/user-attachments/assets/c8adcc67-4f7d-453e-804a-1cf14be0e582" />

# DApp

A DeFi protocol built on Stellar blockchain, featuring liquidity pools, lending, borrowing, and portfolio management.

## Features

- **Dashboard**: Real-time portfolio analytics and performance metrics
- **Liquidity Pools**: Manage and track NFT-based liquidity positions
- **Lending & Borrowing**: Participate in DeFi lending markets
- **Token Swap**: Seamless token exchange interface
- **Portfolio Management**: Track your assets and returns across all positions

## Quick Start

### Prerequisites

Before getting started, ensure you have:

- [Node.js](https://nodejs.org/) (v22 or higher)
- [npm](https://www.npmjs.com/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools)
- [Scaffold Stellar CLI Plugin](https://github.com/AhaLabs/scaffold-stellar)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Neko-Protocol/neko-dapp.git
   cd neko-dapp
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

Edit `.env` to configure your network settings.

4. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## Project Structure

```
neko-dapp/
├── contracts/ # Stellar smart contracts
├── packages/ # Auto-generated contract clients
├── src/
│ ├── components/
│ │ ├── modules/
│ │ │ ├── borrow/ # Borrow interface
│ │ │ ├── dashboard/ # Dashboard views
│ │ │ ├── lend/ # Lending interface
│ │ │ ├── pools/ # Pool management
│ │ │ ├── swap/ # Token swap
│ │ │ └── ui/ # Shared UI components
│ │ ├── ConnectAccount.tsx
│ │ ├── NetworkPill.tsx
│ │ └── WalletButton.tsx
│ ├── contracts/ # Contract interaction helpers
│ ├── debug/ # Contract debugging tools
│ ├── hooks/ # Custom React hooks
│ ├── pages/ # Main pages
│ ├── providers/ # Context providers
│ ├── util/ # Utility functions
│ ├── App.tsx
│ └── main.tsx
├── public/ # Static assets
├── environments.toml # Environment configurations
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Technology Stack

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS 4 + Material-UI
- **Charts**: Chart.js with react-chartjs-2

### Blockchain

- **Network**: Stellar
- **SDK**: @stellar/stellar-sdk
- **Wallet**: Stellar Wallets Kit (@creit.tech/stellar-wallets-kit)
- **Smart Contracts**: Rust with Soroban

## Deployment

### Contract Deployment

1. Publish your contracts to the registry:
   ```bash
   stellar registry publish
   ```

2. Deploy contract instances:
   ```bash
   stellar registry deploy \\
   --deployed-name my-contract \\
   --published-name my-contract \\
   -- \\
   --param1 value1
   ```

3. Create local aliases:
   ```bash
   stellar registry create-alias my-contract
   ```

### Frontend Deployment

Build the frontend for production:
```bash
npm run build
```

Deploy the contents of the `dist/` directory to your hosting platform of choice (Vercel, Netlify, AWS, etc.).

## Environment Configuration

The project uses `environments.toml` for network-specific configurations:

- **local**: Local Stellar network for development
- **testnet**: Stellar testnet
- **mainnet**: Stellar mainnet (production)

Configure your active environment in `.env`:
```env
STELLAR_SCAFFOLD_ENV=local
```

## Key Components

### DeFi Features

- **Swap**: Token exchange interface
- **Lend**: Supply assets to lending pools
- **Borrow**: Borrow against collateral
- **Pools**: Manage liquidity positions

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:

- Passes all linting checks (`npm run lint`)
- Is formatted with Prettier (`npm run format`)
- Includes appropriate TypeScript types
- Follows the existing code style

## License

This project is licensed under the MIT License.

## Links

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)
- [Scaffold Stellar](https://github.com/theahaco/scaffold-stellar)

## Support

For questions and support, please open an issue on GitHub or reach out to the team.
