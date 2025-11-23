# RWA Token Contract

A simplified fungible token contract for Real-World Assets (RWAs) with RWA Oracle price integration.

## Overview

This contract implements a standard fungible token (mint, burn, transfer, balance, approve, allowance) with integration to the RWA Oracle for reading asset prices.

## Features

- ✅ **Standard Token Interface**: Full implementation of Soroban's TokenInterface
- ✅ **RWA Oracle Integration**: Read prices from the RWA Oracle contract
- ✅ **Admin Controls**: Mint, burn, and clawback functionality (admin-only)
- ✅ **Authorization**: Optional authorization status per address
- ✅ **Events**: Mint and burn events for tracking

## Constructor

```rust
pub fn __constructor(
    env: &Env,
    admin: Address,              // Admin address with mint/burn permissions
    asset_contract: Address,     // RWA Oracle contract ID for price feed
    pegged_asset: Symbol,        // Symbol of the RWA asset in the oracle ("NVDA", "TSLA" etc.)
    name: String,                // Full name of the token
    symbol: String,              // Token symbol
    decimals: u32,               // Number of decimal places
)
```

## Key Functions

### Token Operations

- `mint(to, amount)` - Mint tokens to an address (admin-only)
- `burn(from, amount)` - Burn tokens from an address
- `transfer(from, to, amount)` - Transfer tokens
- `approve(from, spender, amount, live_until_ledger)` - Set allowance
- `balance(id)` - Get token balance
- `allowance(from, spender)` - Get allowance

### Price Functions

- `get_price()` - Get the current price of this RWA token from the RWA Oracle
- `get_price_at(timestamp)` - Get the price at a specific timestamp
- `oracle_decimals()` - Get the number of decimals used by the oracle

### Admin Functions

- `set_authorized(id, authorize)` - Set authorization status for an address
- `clawback(from, amount)` - Clawback tokens from an address
- `upgrade(new_wasm_hash)` - Upgrade the contract (admin-only)

## Integration with RWA Oracle

The contract stores:

- `asset_contract`: Address of the RWA Oracle contract
- `pegged_asset`: Symbol of the RWA asset in the oracle ("NVDA", "TSLA" etc.)

When `get_price()` is called, the contract:

1. Queries the RWA Oracle contract
2. Requests the price for the `pegged_asset`
3. Returns the `PriceData` (price and timestamp)

## Events

- `mintrwa`: Emitted when tokens are minted
  - Topic: `("mintrwa", to)`
  - Data: `amount`
- `burnrwa`: Emitted when tokens are burned
  - Topic: `("burnrwa", from)`
  - Data: `amount`

## Usage Example

```rust
// Deploy contract
let admin = Address::random(&env);
let rwa_oracle = Address::from_string("CCF2U62KGK7ZSS6G6SJLR43JZXCDUC4VWW3SAIVWN5OVJL3AU7ILOYZ2");
let contract_id = env.deployer().upload_contract_wasm(&wasm);
env.deployer().deploy_contract(&contract_id, &admin);

let client = RWATokenContractClient::new(&env, &contract_id);
client.__constructor(
    &admin,
    &rwa_oracle,
    &Symbol::new(&env, "NVDA"),
    &String::from_str(&env, "NVIDIA Corporation Token"),
    &String::from_str(&env, "NVDA"),
    &7u32,
);

// Mint tokens
let user = Address::random(&env);
client.mint(&admin, &user, &10_000_000); // 10 tokens (7 decimals)

// Get balance
let balance = client.balance(&user); // 10_000_000

// Get price from oracle
let price_data = client.get_price(); // Returns PriceData { price, timestamp }

// Transfer
let recipient = Address::random(&env);
client.transfer(&user, &recipient, &5_000_000); // Transfer 5 tokens
```

## Testing

Run tests with:

```bash
cargo test --package rwa-token
```
