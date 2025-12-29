<img width="2940" height="770" alt="image" src="https://github.com/user-attachments/assets/c8adcc67-4f7d-453e-804a-1cf14be0e582" />

[Check whitepaper](https://docs.google.com/document/d/1a0oLaen3oTCVS3Ir9NitemQVNZ5T42euSKetHcweOGM/edit?usp=sharing)

Check documents below.

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

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (v1.70 or higher)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools) (v23.1.0 or higher, required for oracle bindings)
- [Scaffold Stellar CLI Plugin](https://github.com/AhaLabs/scaffold-stellar) (optional, for contract development)

**📖 Para una guía detallada paso a paso, consulta [SETUP.md](./SETUP.md)**

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Neko-Protocol/Neko-DApp.git
   cd Neko-DApp
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

   **Alternativa (con Cargo):**

   ```bash
   cargo install --git https://github.com/stellar/stellar-cli --locked stellar-cli
   ```

   Verificar instalación:

   ```bash
   stellar --version
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Generate Oracle contract bindings** (se hace automáticamente en el build, pero puedes hacerlo manualmente):

   ```bash
   npm run generate:oracle-binding
   ```

5. **Build contract packages:**

   ```bash
   npm run build --workspace=packages/oracle
   ```

6. **Start the development server:**
   ```bash
   npm start
   # o alternativamente:
   npm run dev
   ```

The app will be available at `http://localhost:5173`

**Nota:** El contrato Oracle se obtiene directamente desde la red de testnet. No necesita estar en el directorio `contracts/` ya que los bindings se generan automáticamente.

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

- `npm start` / `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (genera bindings del oracle, construye paquetes, compila TypeScript y construye la app)
- `npm run generate:oracle-binding` - Genera los bindings TypeScript del contrato oracle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run install:contracts` - Instala y construye todos los paquetes de contratos

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

## Documents

- [Whitepaper](https://docs.google.com/document/d/1a0oLaen3oTCVS3Ir9NitemQVNZ5T42euSKetHcweOGM/edit?usp=sharing)
- [Day 1 - Project Initialization](https://www.notion.so/Day-1-Project-Initialization-2b007cea0302803082baef18395afb83)
- [Day 2 - Technical Foundation](https://www.notion.so/Day-2-Technical-Foundation-from-Neko-Protocol-2b007cea03028046ab83eef7dd5c8167)
- [Day 3 - Functional Progress](https://www.notion.so/Day-3-Functional-Progress-for-Neko-Protocol-2b007cea0302803292e3d6737f19ada2?source=copy_link)
- [Empathy Map](https://www.notion.so/Empathy-Map-Neko-Protocol-2b107cea03028073a062dce30998c2bb)

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
