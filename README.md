<img width="2940" height="770" alt="image" src="https://github.com/user-attachments/assets/c8adcc67-4f7d-453e-804a-1cf14be0e582" />

# Neko DApp

A DeFi protocol built on Stellar blockchain, featuring liquidity pools, lending, borrowing, and portfolio management.

## Features

- **Dashboard**: Real-time portfolio analytics and performance metrics
- **Liquidity Pools**: Manage and track NFT-based liquidity positions
- **Lending & Borrowing**: Participate in DeFi lending markets
- **Perpetual Futures**: Trade perpetual contracts for RWA stocks.
- **Token Swap**: Seamless token exchange interface
- **Portfolio Management**: Track your assets and returns across all positions
- **Oracle Integration**: Real-time price feeds for RWA (Real-World Assets) tokens

## Quick Start

### Prerequisites

Before getting started, ensure you have:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v10.2.3 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (v1.70 or higher)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools) (v23.1.0 or higher, required for oracle bindings)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Neko-Protocol/Neko-DAppV2.git
   cd Neko-DAppV2
   ```

2. **Install Stellar CLI** (required for generating oracle contract bindings):

   **Linux:**

   ```bash
   curl -sSLO https://github.com/stellar/stellar-cli/releases/latest/download/stellar-cli-x86_64-unknown-linux-gnu.tar.gz
   tar -xzf stellar-cli-*.tar.gz
   sudo mv stellar /usr/local/bin/
   ```

   **macOS (Intel):**

   ```bash
   curl -sSLO https://github.com/stellar/stellar-cli/releases/latest/download/stellar-cli-x86_64-apple-darwin.tar.gz
   tar -xzf stellar-cli-*.tar.gz
   sudo mv stellar /usr/local/bin/
   ```

   **macOS (Apple Silicon):**

   ```bash
   curl -sSLO https://github.com/stellar/stellar-cli/releases/latest/download/stellar-cli-aarch64-apple-darwin.tar.gz
   tar -xzf stellar-cli-*.tar.gz
   sudo mv stellar /usr/local/bin/
   ```

   **Alternative (with Cargo):**

   ```bash
   cargo install --git https://github.com/stellar/stellar-cli --locked stellar-cli
   ```

   Verify installation:

   ```bash
   stellar --version
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Build contract packages:**

   ```bash
   npm run build
   ```

   This will build all contract packages in the monorepo.

5. **Set up environment variables:**

   Create a `.env.local` file in `apps/web-app/`:

   ```env
   # Stellar Network Configuration
   NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
   NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
   NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
   NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

   # SoroSwap ApiKey
   NEXT_PUBLIC_SOROSWAP_API_KEY=your_api_key_here
   ```

6. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Project Structure

This is a monorepo managed with [Turborepo](https://turbo.build/repo) and npm workspaces:

```
neko-dapp/
├── apps/
│   ├── web-app/              # Next.js web application
│   │   ├── src/
│   │   │   ├── app/          # Next.js App Router pages
│   │   │   │   ├── dashboard/ # Dashboard routes
│   │   │   │   └── (marketing)/ # Marketing pages
│   │   │   ├── features/     # Feature-based modules
│   │   │   │   ├── borrowing/ # Borrow feature
│   │   │   │   ├── lending/   # Lend feature
│   │   │   │   ├── stocks/    # Oracle/Stocks feature
│   │   │   │   ├── swap/      # Token swap feature
│   │   │   │   ├── pools/     # Pool management
│   │   │   │   ├── wallet/    # Wallet integration
│   │   │   │   └── dashboard/ # Dashboard feature
│   │   │   ├── components/    # Shared UI components
│   │   │   │   ├── ui/        # Reusable UI components
│   │   │   │   ├── charts/    # Chart components
│   │   │   │   ├── layout/    # Layout components
│   │   │   │   └── navigation/ # Navigation components
│   │   │   ├── contracts/     # Contract utilities
│   │   │   ├── debug/         # Debug utilities
│   │   │   ├── lib/           # Shared utilities
│   │   │   │   ├── helpers/   # Helper functions
│   │   │   │   └── constants/ # Constants and config
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── providers/     # Context providers
│   │   │   └── stores/        # Zustand stores
│   │   └── public/            # Static assets
│   └── contracts/             # Smart contracts
│       ├── stellar-contracts/ # Stellar/Soroban contracts (Rust)
│       │   ├── rwa-lending/   # RWA Lending contract
│       │   ├── rwa-oracle/    # RWA Oracle contract
│       │   ├── rwa-token/     # RWA Token contract
│       │   └── rwa-perps/     # RWA Perpetuals contract
│       └── evm-contracts/     # EVM/Solidity contracts (Foundry)
│           └── rwa-lending/   # RWA Lending contract (EVM)
├── packages/
│   ├── config/                # Shared configuration
│   │   ├── eslint.config.mjs  # ESLint config
│   │   ├── tailwind.config.ts # Tailwind config
│   │   ├── postcss.config.mjs # PostCSS config
│   │   └── tsconfig.json      # TypeScript config
│   └── contracts/             # Contract client packages
│       ├── oracle/            # Oracle contract client (@neko/oracle)
│       └── lending/           # Lending contract client (@neko/lending)
├── turbo.json                 # Turborepo configuration
└── package.json               # Root package.json
```

## Available Scripts

### Root Level

- `npm run dev` - Start all development servers (web app)
- `npm run build` - Build all packages and apps for production
- `npm run start` - Start production servers
- `npm run lint` - Run ESLint across all packages
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Web App Specific

- `cd apps/web-app && npm run dev` - Start Next.js dev server with Turbopack
- `cd apps/web-app && npm run build` - Build Next.js app for production
- `cd apps/web-app && npm run start` - Start Next.js production server
- `cd apps/web-app && npm run lint` - Run ESLint

## Technology Stack

### Frontend

- **Framework**: Next.js 16 with React 19
- **Build Tool**: Turbopack (Next.js built-in)
- **Routing**: Next.js App Router
- **Styling**: Tailwind CSS 4 + Stellar Design System
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Chart.js with react-chartjs-2, Recharts
- **UI Components**: Material-UI, Stellar Design System

### Blockchain

- **Stellar Network**: @stellar/stellar-sdk, Stellar Wallets Kit
- **EVM Network**: viem, wagmi, RainbowKit
- **Stellar Contracts**: Rust with Soroban
- **EVM Contracts**: Solidity with Foundry
- **Contract Clients**: TypeScript bindings for contracts

### Monorepo

- **Build System**: Turborepo
- **Package Manager**: npm workspaces
- **Code Quality**: ESLint, Prettier, Husky

## Architecture

The project follows a feature-based architecture:

- **Features**: Self-contained modules for each major feature (lending, borrowing, stocks, etc.)
- **Components**: Shared UI components used across features
- **Lib**: Shared utilities, helpers, and constants
- **Hooks**: Reusable React hooks
- **Providers**: Context providers for global state

Each feature contains:

- `components/` - Feature-specific components
- `hooks/` - Feature-specific hooks
- `utils/` - Feature-specific utilities

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

This will build the Next.js app. Deploy the contents of `apps/web-app/.next` directory to your hosting platform of choice (Vercel, Netlify, AWS, etc.).

**Recommended**: Deploy to [Vercel](https://vercel.com/) for optimal Next.js support.

## Environment Configuration

The project uses environment variables with the `NEXT_PUBLIC_` prefix for client-side access.

Create `apps/web-app/.env.local`:

```env
# Stellar Network Configuration
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# SoroSwap ApiKey
NEXT_PUBLIC_SOROSWAP_API_KEY=your_api_key_here
```

Available networks:

- **TESTNET**: Stellar testnet (default for development)
- **FUTURENET**: Stellar futurenet
- **PUBLIC**: Stellar mainnet (production)
- **LOCAL**: Local Stellar network for development

## Key Components

### DeFi Features

- **Swap**: Token exchange interface using SoroSwap SDK
- **Lend**: Supply assets to lending pools
- **Borrow**: Borrow against collateral
- **Pools**: Manage liquidity positions
- **Oracle**: Real-time price feeds for RWA tokens

### Contract Packages

The `packages/contracts/` directory contains TypeScript clients for smart contracts:

- `@neko/oracle` - Oracle contract client
- `@neko/lending` - Lending contract client

These packages are automatically linked via npm workspaces.

## Development

### Adding a New Feature

1. Create a new directory in `apps/web-app/src/features/`
2. Add feature-specific components, hooks, and utilities
3. Create a route in `apps/web-app/src/app/dashboard/` if needed
4. Update navigation in `apps/web-app/src/components/navigation/Navbar.tsx`

### Adding a New Contract Package

1. Create a new directory in `packages/contracts/`
2. Add `package.json` with name `@neko/your-contract`
3. Create TypeScript bindings in `src/index.ts`
4. Build with `npm run build` from root

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
- Uses conventional commits (feat, fix, chore, etc.)

## License

This project is licensed under the MIT License.

## Links

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## Support

For questions and support, please open an issue on GitHub or reach out to the team.
