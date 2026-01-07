# RWA Lending Protocol

A permissionless lending protocol for Ondo RWA (Real-World Asset) tokens on Ethereum, allowing users to deposit RWA tokens as collateral and borrow stablecoins.

## Overview

This protocol enables:

1. **Deposit** Ondo RWA tokens (TSLAon, NVDAon, AAPLon, etc.) as collateral
2. **Borrow** stablecoins (USDC, USDT) against collateral
3. **Earn interest** by supplying stablecoins to the lending pool
4. **Liquidate** undercollateralized positions for profit
5. **Emergency protection** via Backstop reserves for critical liquidations

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LendingPool                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Collateral   │  │    Borrow     │  │  Liquidation  │            │
│  │  Management   │  │  Management   │  │    Engine     │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                  │                      │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐             │
│  │   OToken    │  │  DebtToken   │  │ PriceOracle  │             │
│  │ (Collateral)│  │    (Debt)    │  │ (Chainlink)  │             │
│  └─────────────┘  └──────────────┘  └──────┬───────┘             │
│                                              │                       │
│                                    ┌─────────▼─────────┐           │
│                                    │     Backstop       │           │
│                                    │ (Emergency Reserves)│          │
│                                    └────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

## Contracts

### Core Contracts

#### `LendingPool.sol`

**Main entry point for all protocol interactions**

The central contract managing all lending operations:

- **Collateral Management**: Users deposit RWA tokens and receive OTokens (receipt tokens)
- **Borrowing**: Users borrow stablecoins against their collateral with interest accrual
- **Liquidation**: Liquidators can liquidate undercollateralized positions
- **Emergency Liquidation**: Uses Backstop reserves when normal liquidation fails
- **Interest Rate Model**: Dynamic interest rates based on utilization
- **Health Factor**: Tracks position health to prevent risky withdrawals

**Key Functions:**

- `depositCollateral()` - Deposit RWA tokens as collateral
- `withdrawCollateral()` - Withdraw collateral (if health factor allows)
- `borrow()` - Borrow stablecoins against collateral
- `repay()` - Repay borrowed amount with interest
- `liquidate()` - Liquidate undercollateralized positions
- `emergencyLiquidateWithBackstop()` - Emergency liquidation using backstop funds
- `getHealthFactor()` - Calculate position health factor
- `getMaxBorrowable()` - Get maximum borrowable amount

**Access Control:**

- `onlyOwner` - Admin functions (add assets, set oracle, pause)
- `onlyOwnerOrEmergencyAdmin` - Emergency liquidation functions

#### `CustomPriceOracle.sol` / `PriceOracle.sol`

**Price feed integration for asset valuation**

Provides asset prices for collateral and debt valuation:

- **Chainlink Integration**: Uses Chainlink price feeds for accurate pricing
- **Manual Price Updates**: Supports manual price updates for assets without Chainlink feeds
- **Staleness Checks**: Validates price freshness to prevent manipulation
- **Multi-Asset Support**: Manages prices for all supported collateral and borrow assets

**Key Functions:**

- `getAssetPrice()` - Get current price of an asset
- `setAssetSource()` - Set Chainlink price feed for an asset
- `setAssetPrice()` - Manually set price (authorized keepers only)

#### `Backstop.sol`

**Emergency reserve contract for liquidation protection**

Based on Aave's Collector pattern, holds protocol reserves for emergency situations:

- **Reserve Management**: Tracks and manages emergency reserves for each token
- **Emergency Withdrawals**: Only emergency admins can withdraw in critical situations
- **Multiple Deposit Methods**: Supports owner, emergency admin, and public deposits
- **Token Whitelist**: Only whitelisted tokens can be held as reserves
- **Integration with LendingPool**: Used for emergency liquidations when normal liquidation fails

**Key Functions:**

- `emergencyWithdraw()` - Emergency withdrawal with reason (for liquidations)
- `depositReserve()` - Public deposit to build reserves
- `ownerDeposit()` - Owner deposit from their balance
- `emergencyDeposit()` - Emergency admin deposit
- `withdrawReserve()` - Normal withdrawal by owner
- `transfer()` - Simple transfer (doesn't update reserves)
- `approve()` - Approve tokens for spending by other contracts
- `getReserveBalance()` - Get reserve balance for a token

**Access Control:**

- `onlyOwner` - Owner-only functions (withdrawReserve, setTokenSupport)
- `onlyEmergencyAdmin` - Emergency functions (emergencyWithdraw, emergencyDeposit, transfer, approve)

**Events:**

- `EmergencyWithdrawal` - Emitted when emergency withdrawal occurs
- `ReserveDeposited` - Emitted when reserves are deposited
- `ReserveWithdrawn` - Emitted when reserves are withdrawn
- `TokenSupportChanged` - Emitted when token support is updated

### Token Contracts

#### `OToken.sol`

**Receipt token for collateral deposits**

ERC20 token representing user's collateral position:

- **Minting**: Minted when users deposit collateral
- **Burning**: Burned when users withdraw collateral
- **Non-Transferable**: Cannot be transferred (enforced by `_beforeTokenTransfer`)
- **Interest Accrual**: Tracks accrued interest through exchange rate mechanism
- **Pool Integration**: Only LendingPool can mint/burn

**Key Functions:**

- `mint()` - Mint tokens (only by LendingPool)
- `burn()` - Burn tokens (only by LendingPool)
- `getScaledBalance()` - Get scaled balance for interest calculations
- `decimals()` - Returns underlying asset decimals

#### `DebtToken.sol`

**Non-transferable token tracking user debt**

ERC20 token representing user's debt position:

- **Minting**: Minted when users borrow
- **Burning**: Burned when users repay
- **Non-Transferable**: Cannot be transferred (enforced by `_beforeTokenTransfer`)
- **Interest Accrual**: Tracks accrued interest through scaled debt mechanism
- **Pool Integration**: Only LendingPool can mint/burn

**Key Functions:**

- `mint()` - Mint debt tokens (only by LendingPool)
- `burn()` - Burn debt tokens (only by LendingPool)
- `getScaledDebt()` - Get scaled debt for interest calculations
- `decimals()` - Returns underlying asset decimals

### Interfaces

#### `ILendingPool.sol`

Interface defining all LendingPool functions and events for integration.

#### `IBackstop.sol`

Interface defining all Backstop functions and events for integration.

#### `IOToken.sol`

Interface for OToken contract.

#### `IDebtToken.sol`

Interface for DebtToken contract.

#### `IPriceOracle.sol`

Interface for PriceOracle contract.

### Libraries

#### `DataTypes.sol`

**Data structures used across the protocol**

Defines all structs and enums:

- `CollateralConfig` - Configuration for collateral assets (LTV, liquidation threshold, bonus)
- `BorrowConfig` - Configuration for borrow assets (interest rate parameters, decimals)
- `UserCollateral` - User's collateral position
- `UserBorrow` - User's borrow position

#### `WadRayMath.sol`

**Fixed-point math library**

Handles calculations with 18 decimals (WAD) and 27 decimals (RAY):

- `wadMul()` / `wadDiv()` - WAD multiplication and division
- `rayMul()` / `rayDiv()` - RAY multiplication and division
- `percentMul()` - Percentage multiplication
- Used for interest rate calculations and health factor computations

#### `Errors.sol`

**Custom error definitions**

Gas-efficient error definitions:

- `ZeroAddress()` - Invalid zero address
- `ZeroAmount()` - Invalid zero amount
- `Unauthorized()` - Unauthorized access
- `Paused()` - Protocol is paused
- And more...

## Supported Assets

### Collateral (Example Ondo RWA tokens, then a change will be made to the Backed Tokenized Stocks)

| Token      | Symbol | Address (Ethereum)                           |
| ---------- | ------ | -------------------------------------------- |
| NVIDIA     | NVDAon | `0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee` |
| Tesla      | TSLAon | `0xf6b1117ec07684d3958cad8beb1b302bfd21103f` |
| Apple      | AAPLon | `0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c` |
| Microsoft  | MSFTon | `0xb812837b81a3a6b81d7cd74cfb19a7f2784555e5` |
| Amazon     | AMZNon | `0xbb8774fb97436d23d74c1b882e8e9a69322cfd31` |
| Meta       | METAon | `0x59644165402b611b350645555b50afb581c71eb2` |
| Spotify    | SPOTon | `0x590f21186489ca1612f49a4b1ff5c66acd6796a9` |
| Shopify    | SHOPon | `0x908266c1192628371cff7ad2f5eba4de061a0ac5` |
| Mastercard | MAon   | `0xa29dc2102dfc2a0a4a5dcb84af984315567c9858` |
| Netflix    | NFLXon | `0x032dec3372f25c41ea8054b4987a7c4832cdb338` |

### Borrowable (Stablecoins)

| Token    | Symbol | Address (Ethereum)                           |
| -------- | ------ | -------------------------------------------- |
| USD Coin | USDC   | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Tether   | USDT   | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |

## Risk Parameters

### Collateral Parameters

| Parameter             | TSLAon (Volatile) | AAPLon (Stable) |
| --------------------- | ----------------- | --------------- |
| LTV                   | 50%               | 60%             |
| Liquidation Threshold | 65%               | 75%             |
| Liquidation Bonus     | 10%               | 8%              |

**Parameter Definitions:**

- **LTV (Loan-to-Value)**: Maximum borrowing power as percentage of collateral value
- **Liquidation Threshold**: Collateral value percentage at which position becomes liquidatable
- **Liquidation Bonus**: Bonus percentage liquidators receive when liquidating

### Interest Rate Model

The protocol uses a dynamic interest rate model based on utilization:

```
if (utilization <= optimalUtilization):
    rate = baseRate + slope1 * (utilization / optimalUtilization)
else:
    rate = baseRate + slope1 + slope2 * (utilization - optimal) / (1 - optimal)
```

**Default Parameters:**

- Base Rate: 2% (200 basis points)
- Slope 1: 4% (400 basis points)
- Slope 2: 75% (7500 basis points)
- Optimal Utilization: 80% (8000 basis points)

**Interest Accrual:**

- Interest accrues continuously using compound interest formula
- Uses scaled balances (RAY precision) for accurate calculations
- Interest is added to debt when borrowing and subtracted when repaying

## User Flows

### 1. Depositing Collateral & Borrowing

```solidity
// 1. Approve collateral transfer
TSLAon.approve(lendingPool, 100e18);

// 2. Deposit collateral (receives OTokens)
lendingPool.depositCollateral(TSLAon, 100e18);

// 3. Check health factor
uint256 healthFactor = lendingPool.getHealthFactor(msg.sender);
require(healthFactor > 1e18, "Position too risky");

// 4. Borrow stablecoins (receives DebtTokens)
lendingPool.borrow(USDC, 5000e6);
```

### 2. Repaying & Withdrawing

```solidity
// 1. Check current debt
uint256 debt = lendingPool.getUserDebt(msg.sender, USDC);

// 2. Approve repayment
USDC.approve(lendingPool, debt);

// 3. Repay full debt
lendingPool.repay(USDC, type(uint256).max);

// 4. Check health factor allows withdrawal
uint256 healthFactor = lendingPool.getHealthFactor(msg.sender);
require(healthFactor > 1e18, "Cannot withdraw");

// 5. Withdraw collateral
lendingPool.withdrawCollateral(TSLAon, 100e18);
```

### 3. Normal Liquidation

```solidity
// 1. Check if position is liquidatable
uint256 healthFactor = lendingPool.getHealthFactor(user);
require(healthFactor < 1e18, "Position healthy");

// 2. Calculate debt to cover (up to 50% of debt)
uint256 debt = lendingPool.getUserDebt(user, USDC);
uint256 debtToCover = debt / 2; // Max 50% per liquidation

// 3. Approve debt repayment
USDC.approve(lendingPool, debtToCover);

// 4. Liquidate (receive collateral + bonus)
lendingPool.liquidate(user, TSLAon, USDC, debtToCover);
```

### 4. Emergency Liquidation (Using Backstop)

```solidity
// Only owner or emergency admin can call this
// Used when normal liquidation fails and backstop has funds

// 1. Check backstop has sufficient reserves
uint256 backstopBalance = backstop.getReserveBalance(USDC);
require(backstopBalance >= debtToCover, "Insufficient backstop funds");

// 2. Execute emergency liquidation
lendingPool.emergencyLiquidateWithBackstop(
    user,
    TSLAon,  // collateral asset
    USDC,    // debt asset
    debtToCover
);
```

### 5. Backstop Management

```solidity
// Owner deposits to backstop
backstop.ownerDeposit(USDC, 100000e6);

// Emergency admin deposits to backstop
backstop.emergencyDeposit(USDC, 50000e6);

// Public deposit (anyone can deposit)
USDC.approve(backstop, amount);
backstop.depositReserve(USDC, amount);

// Owner withdraws from backstop (normal operation)
backstop.withdrawReserve(USDC, recipient, amount);

// Emergency withdrawal (only in critical situations)
backstop.emergencyWithdraw(USDC, recipient, amount, "Emergency liquidation");
```

## Deployment

### Prerequisites

1. Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:

```bash
cd apps/contracts/evm-contracts/rwa-lending
bash setup.sh
```

### Deployment Script

The deployment script (`script/Deploy.s.sol`) handles the complete deployment:

```bash
# Set environment variables
export PRIVATE_KEY=<your-private-key>
export ETH_RPC_URL=<your-rpc-url>

# Deploy
forge script script/Deploy.s.sol --rpc-url $ETH_RPC_URL --broadcast
```

### Manual Deployment Steps

#### 1. Deploy PriceOracle

```solidity
PriceOracle oracle = new PriceOracle();

// Set Chainlink price feeds for each asset
oracle.setAssetSource(TSLAon, TSLA_USD_FEED);
oracle.setAssetSource(USDC, USDC_USD_FEED);
// ... set for all assets
```

#### 2. Deploy Backstop

```solidity
Backstop backstop = new Backstop();

// Set token support
backstop.setTokenSupport(USDC, true);
backstop.setTokenSupport(USDT, true);
```

#### 3. Deploy LendingPool

```solidity
LendingPool pool = new LendingPool(address(oracle));

// Set backstop
pool.setBackstop(address(backstop));

// Add collateral assets
pool.addCollateralAsset(
    TSLAon,
    5000,  // 50% LTV
    6500,  // 65% liquidation threshold
    1000   // 10% liquidation bonus
);

// Add borrowable assets
pool.addBorrowAsset(
    USDC,
    200,   // 2% base rate
    400,   // 4% slope1
    7500,  // 75% slope2
    8000   // 80% optimal utilization
);
```

#### 4. Initial Backstop Funding

```solidity
// Owner deposits initial reserves
USDC.approve(backstop, initialAmount);
backstop.ownerDeposit(USDC, initialAmount);
```

## Security Considerations

### Protocol Security

1. **No Whitelist Required** - Ondo tokens are freely transferable ERC20 tokens
2. **Liquidations via DEX** - Liquidators can sell seized collateral on CoW Swap, Uniswap, etc.
3. **Chainlink Oracles** - Price staleness checks prevent manipulation
4. **ReentrancyGuard** - All state-changing functions protected
5. **Health Factor Checks** - Prevents withdrawals that would make position liquidatable
6. **Access Control** - Owner and emergency admin roles for critical functions
7. **Pausable** - Protocol can be paused in emergency situations

### Backstop Security

1. **Role-Based Access** - Only owner and emergency admins can withdraw
2. **Token Whitelist** - Only approved tokens can be held as reserves
3. **ReentrancyGuard** - All withdrawal functions protected
4. **Emergency Tracking** - All emergency withdrawals require reason for audit trail
5. **Reserve Tracking** - Separate tracking of reserves vs contract balance

### Best Practices

1. **Monitor Health Factors** - Users should monitor their health factor to avoid liquidation
2. **Oracle Monitoring** - Monitor price feeds for staleness
3. **Backstop Reserves** - Maintain adequate reserves for emergency situations
4. **Gradual Deployment** - Deploy and test on testnets first
5. **Audit Before Mainnet** - Conduct security audits before mainnet deployment

## Testing

### Running Tests

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run with gas report
forge test --gas-report

# Fork testing (mainnet)
forge test --fork-url $ETH_RPC_URL

# Run specific test file
forge test --match-path test/LendingPool.t.sol
```

### Test Coverage

- Unit tests for all core functions
- Integration tests for user flows
- Edge case testing (zero amounts, max values, etc.)
- Access control testing
- Reentrancy protection testing

## Gas Optimization

The protocol uses several gas optimization techniques:

1. **Custom Errors** - Instead of require strings (saves gas)
2. **Packed Structs** - Efficient storage layout
3. **Scaled Balances** - Reduces storage operations
4. **Batch Operations** - Efficient multi-asset operations
5. **Minimal External Calls** - Reduces gas costs

## Events

All important actions emit events for off-chain tracking:

- `CollateralDeposited` - When collateral is deposited
- `CollateralWithdrawn` - When collateral is withdrawn
- `Borrowed` - When user borrows
- `Repaid` - When user repays
- `Liquidated` - When position is liquidated
- `EmergencyLiquidated` - When emergency liquidation occurs
- `ReserveDeposited` - When backstop receives deposits
- `EmergencyWithdrawal` - When backstop emergency withdrawal occurs

## License

MIT
