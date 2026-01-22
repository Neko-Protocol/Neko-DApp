# Funding Rate System Design

## Architecture Overview

The funding rate system implements a simple time-based funding mechanism for RWA perpetuals. It consists of four main functions that handle admin rate updates, funding accrual, rate queries, and payment calculations.

## Component Design

### 1. Funding Operations Module

**Location**: `apps/contracts/stellar-contracts/rwa-perps/src/operations/funding.rs`

**Purpose**: Contains all funding-related business logic

**Structure**:
```rust
pub struct Funding;

impl Funding {
    pub fn update_funding_rate(env: &Env, rwa_token: &Address, new_rate: i128) -> Result<(), Error>
    pub fn accrue_funding(env: &Env, trader: &Address, rwa_token: &Address) -> Result<i128, Error>
    pub fn get_funding_rate(env: &Env, rwa_token: &Address) -> Result<i128, Error>
    pub fn calculate_funding_payment(position: &Position, market_config: &MarketConfig, current_time: u64) -> i128
}
```

### 2. Error Extensions

**Location**: `apps/contracts/stellar-contracts/rwa-perps/src/common/error.rs`

**New Errors**:
```rust
// Funding errors (70-79 range)
InvalidFundingRate = 70,
FundingCalculationError = 71,
```

### 3. Optional Funding History

**Structure**:
```rust
// Use existing FundingPayment struct from types.rs
pub struct FundingPayment {
    pub position_id: Address,
    pub amount: i128,
    pub timestamp: u64,
}
```

## Function Specifications

### update_funding_rate()

**Purpose**: Admin function to update funding rate for a market

**Parameters**:
- `env: &Env` - Contract environment
- `rwa_token: &Address` - Market identifier  
- `new_rate: i128` - New funding rate in basis points

**Logic**:
1. Get admin address and require authorization
2. Get market config for the RWA token
3. Update market_config.funding_rate = new_rate
4. Update market_config.last_funding_update = current_time
5. Save updated market config

**Returns**: `Result<(), Error>`

### accrue_funding()

**Purpose**: Calculate and apply funding payment to a position

**Parameters**:
- `env: &Env` - Contract environment
- `trader: &Address` - Position owner
- `rwa_token: &Address` - Market identifier

**Logic**:
1. Get position and market config
2. Calculate funding payment using helper function
3. Update position.margin (subtract if positive, add if negative)
4. Update position.last_funding_payment = current_time
5. Optionally store funding payment in history
6. Save updated position

**Returns**: `Result<i128, Error>` - The funding payment amount

### get_funding_rate()

**Purpose**: Retrieve current funding rate for a market

**Parameters**:
- `env: &Env` - Contract environment
- `rwa_token: &Address` - Market identifier

**Logic**:
1. Get market config for RWA token
2. Return market_config.funding_rate

**Returns**: `Result<i128, Error>`

### calculate_funding_payment()

**Purpose**: Pure helper function to calculate funding payment

**Parameters**:
- `position: &Position` - Position data
- `market_config: &MarketConfig` - Market configuration
- `current_time: u64` - Current timestamp

**Logic**:
1. Calculate time_elapsed = current_time - position.last_funding_payment
2. If position.last_funding_payment is 0, use position.opened_at
3. Calculate: payment = position.size * market_config.funding_rate * time_elapsed / BASIS_POINTS
4. Return payment amount

**Returns**: `i128` - Funding payment (positive = trader pays, negative = trader receives)

## Data Flow

### Funding Rate Update Flow
```
Admin → update_funding_rate() → MarketConfig.funding_rate updated → Storage
```

### Funding Accrual Flow  
```
Position → calculate_funding_payment() → Payment Amount → Update Position.margin → Storage
```

### Rate Query Flow
```
Query → get_funding_rate() → MarketConfig.funding_rate → Return to caller
```

## Integration Points

### Existing Systems
- **Storage**: Uses existing Storage struct for data persistence
- **Admin**: Uses existing admin authorization system
- **MarketConfig**: Uses existing funding_rate and last_funding_update fields
- **Position**: Uses existing margin and last_funding_payment fields

### Contract Interface
Functions will be exposed through the main RWAPerpsContract:
```rust
// Add to contract.rs
pub fn update_funding_rate(env: Env, rwa_token: Address, new_rate: i128) -> Result<(), Error>
pub fn accrue_funding(env: Env, trader: Address, rwa_token: Address) -> Result<i128, Error>  
pub fn get_funding_rate(env: Env, rwa_token: Address) -> Result<i128, Error>
```

## Testing Strategy

### Unit Tests
- Test each function with valid inputs
- Test admin authorization validation
- Test positive and negative funding rates
- Test time calculation edge cases
- Test margin update logic

### Integration Tests  
- Test complete funding flow from rate update to accrual
- Test multiple positions with different rates
- Test funding history storage (if implemented)

### Test Cases
1. **Positive Funding Rate Tests**
   - Long position pays funding
   - Short position receives funding

2. **Negative Funding Rate Tests**
   - Long position receives funding
   - Short position pays funding

3. **Time Calculation Tests**
   - Zero time elapsed
   - Normal time periods
   - Large time gaps

4. **Authorization Tests**
   - Admin can update rates
   - Non-admin cannot update rates

5. **Edge Cases**
   - Zero position size
   - Zero funding rate
   - New positions (last_funding_payment = 0)

## Implementation Notes

### Formula Implementation
The core formula `funding_payment = position_size * funding_rate * time_elapsed` will be implemented with basic arithmetic. Time is in seconds, funding rate in basis points.

### Basis Points Conversion
Funding rates are stored and input as basis points (10000 = 100%). The calculation divides by BASIS_POINTS constant.

### Time Handling
- Use `env.ledger().timestamp()` for current time
- Time elapsed calculated as simple subtraction
- Handle case where last_funding_payment is 0 (new position)

### Optional Features
Funding payment history storage is marked as optional and can be implemented as a simple persistent storage entry with composite key (trader, rwa_token, timestamp).

## Correctness Properties

### Property 1: Admin Authorization
**Validates**: Requirements AC-1  
**Property**: Only admin can update funding rates
**Test**: Non-admin calls should fail with Unauthorized error

### Property 2: Payment Direction  
**Validates**: Requirements AC-2
**Property**: Payment sign matches position type and funding rate sign
**Test**: Long + positive rate = positive payment (trader pays)

### Property 3: Time-Based Accrual
**Validates**: Requirements AC-2, AC-3
**Property**: Funding payment is proportional to time elapsed
**Test**: Double time period = double payment amount

### Property 4: Margin Conservation
**Validates**: Requirements AC-3
**Property**: Position margin changes by exact funding payment amount
**Test**: margin_after = margin_before - funding_payment

### Property 5: Timestamp Updates
**Validates**: Requirements AC-3  
**Property**: last_funding_payment timestamp advances after accrual
**Test**: Timestamp equals current ledger time after accrual