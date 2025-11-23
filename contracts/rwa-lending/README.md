# RWA Lending Contract

A Blend-based lending/borrowing protocol for Real-World Assets (RWAs) on Soroban.

## Overview

This contract implements a lending/borrowing protocol based on Blend's architecture, adapted for RWAs. Users can:

- **Lend** crypto assets (USDC, XLM, etc.) and earn interest via bTokens
- **Borrow** crypto assets using RWA tokens as collateral via dTokens
- **Liquidate** underwater positions through Dutch Auctions

## Architecture

### Core Components

1. **Lending Pool**: Single pool for lending and borrowing
2. **bTokens**: Blend tokens representing lender deposits + accrued interest
3. **dTokens**: Debt tokens representing borrower liabilities + accrued interest
4. **Collateral Management**: Multiple RWA tokens as collateral, single debt asset
5. **Dynamic Interest Rates**: Utilization-based interest rate model
6. **Dutch Auctions**: Liquidation mechanism for underwater positions
7. **Backstop Module**: First-loss capital to cover bad debt (optional for MVP)

### Key Features

- ✅ **Single Pool**: Unified pool for lending and borrowing
- ✅ **bTokens for Lending**: Automatic interest accrual via bTokenRate
- ✅ **dTokens for Borrowing**: Single asset debt tracking via dTokenRate
- ✅ **Multiple RWA Collaterals**: Support for multiple RWA tokens as collateral
- ✅ **Single Debt Asset**: One crypto asset borrowed at a time per borrower
- ✅ **Dynamic Interest Rates**: Utilization-based rate adjustments
- ✅ **Dutch Auctions**: Time-based liquidation mechanism
- ✅ **Backstop Module**: Insurance for lenders (optional)

## Constructor

```rust
pub fn __constructor(
    env: &Env,
    admin: Address,
    rwa_oracle: Address,           // RWA Oracle for collateral prices
    reflector_oracle: Address,      // Reflector Oracle for debt prices
    supported_assets: Vec<Symbol>,  // Supported crypto assets for lending/borrowing (USDC, XLM, etc.)
    interest_rate_params: Map<Symbol, InterestRateParams>,  // Interest rate params per asset
    collateral_factors: Map<Address, u32>,  // Collateral factor per RWA token (in basis points)
    backstop_threshold: i128,      // Minimum backstop deposits to activate pool
    backstop_take_rate: u32,       // Interest share for backstop (in basis points)
)
```

## Key Functions

### Lending

- `deposit(asset, amount)` - Deposit crypto asset and receive bTokens
- `withdraw(asset, b_tokens)` - Withdraw crypto asset by burning bTokens

### Borrowing

- `add_collateral(rwa_token, amount)` - Add RWA tokens as collateral
- `remove_collateral(rwa_token, amount)` - Remove RWA collateral
- `borrow(asset, amount)` - Borrow crypto asset (single asset per borrower)
- `repay(asset, d_tokens)` - Repay debt by burning dTokens

### Liquidations

- `initiate_liquidation(borrower, rwa_token, liability_percent)` - Start Dutch Auction
- `fill_auction(borrower, rwa_token, fill_percent)` - Fill auction partially or fully

### Backstop

- `backstop_deposit(amount)` - Deposit to backstop module
- `initiate_backstop_withdrawal(amount)` - Queue withdrawal (21 days)
- `complete_backstop_withdrawal()` - Complete withdrawal after queue

## Oracle Integration

- **RWA Oracle**: Used for collateral price feeds (NVDA, TSLA, etc.)
- **Reflector Oracle**: Used for debt asset prices (USDC, XLM, etc.)

## Interest Rate Model

Dynamic utilization-based interest rate with 3 segments:

1. Low utilization (≤ target): Low rate, incentivizes borrowing
2. Medium utilization (target - 95%): Medium rate, stabilizes
3. High utilization (>95%): High rate, protects pool

Rate Modifier adjusts automatically to maintain target utilization.

## Liquidation Process

1. Borrower's Health Factor < 1.0 → CDP is insolvent
2. Anyone can initiate liquidation → Creates Dutch Auction
3. Lot Modifier (LM) increases over time → More collateral for liquidator
4. Bid Modifier (BM) decreases over time → Less debt to repay
5. Liquidator fills auction → Receives collateral, pays debt

## Testing

Run tests with:

```bash
cargo test --package rwa-lending
```
