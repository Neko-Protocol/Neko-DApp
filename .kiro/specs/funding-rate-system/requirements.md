# Funding Rate System Requirements

## Overview
Implement a funding rate system for RWA perpetuals that allows admin to set funding rates and automatically calculates/applies funding payments to trader positions based on time elapsed.

## User Stories

### US-1: Admin Funding Rate Management
**As an** admin  
**I want to** update funding rates for RWA markets  
**So that** I can keep perpetual prices aligned with spot prices through economic incentives

### US-2: Automatic Funding Accrual  
**As a** trader with an open position  
**I want** funding payments to be calculated and applied to my margin automatically  
**So that** I pay or receive funding based on my position and time held

### US-3: Funding Rate Inquiry
**As a** trader or external system  
**I want to** query the current funding rate for any market  
**So that** I can understand the cost of holding positions

## Acceptance Criteria

### AC-1: Admin Funding Rate Updates
- Admin can update funding rate for any RWA token market
- System validates admin authorization before allowing updates
- MarketConfig is updated with new rate and current timestamp
- Funding rate is stored in basis points (e.g., 100 = 1%)

### AC-2: Funding Payment Calculation
- System calculates funding payments using formula: `funding_payment = position_size * funding_rate * time_elapsed`
- Positive payment means trader pays funding
- Negative payment means trader receives funding
- Time elapsed is calculated from last funding payment timestamp

### AC-3: Funding Accrual Process
- System can accrue funding for any position
- Position margin is updated (decreased if payment positive, increased if negative)
- Position's last_funding_payment timestamp is updated to current time
- Funding payments can optionally be stored in history

### AC-4: Funding Rate Retrieval
- System provides function to get current funding rate for any market
- Returns the rate stored in MarketConfig

### AC-5: Testing Coverage
- All functions have comprehensive tests
- Tests cover positive and negative funding rates
- Tests verify time-based calculations
- Tests validate admin authorization
- All tests pass successfully

## Technical Requirements

### TR-1: File Structure
- Implement in `apps/contracts/stellar-contracts/rwa-perps/src/operations/funding.rs`
- Add funding-related errors to `apps/contracts/stellar-contracts/rwa-perps/src/common/error.rs`
- Add tests to `apps/contracts/stellar-contracts/rwa-perps/src/test/mod.rs`

### TR-2: Data Integration
- Use existing `MarketConfig.funding_rate` field for storage
- Use existing `MarketConfig.last_funding_update` field for timestamps
- Use existing `Position.last_funding_payment` field for position tracking
- Use existing `Position.margin` field for funding application

### TR-3: Function Signatures
- `update_funding_rate(env, rwa_token, new_rate)` - admin only
- `accrue_funding(env, trader, rwa_token)` - applies funding to position
- `get_funding_rate(env, rwa_token)` - returns current rate
- `calculate_funding_payment(position, market_config, current_time)` - helper function

## Business Rules

### BR-1: Payment Direction
- Long positions (size > 0) with positive funding rate: trader pays
- Long positions (size > 0) with negative funding rate: trader receives  
- Short positions (size < 0) with positive funding rate: trader receives
- Short positions (size < 0) with negative funding rate: trader pays

### BR-2: Time Calculation
- Time elapsed = current_time - position.last_funding_payment
- If position.last_funding_payment is 0, use position.opened_at
- Time is measured in seconds

### BR-3: Margin Updates
- Subtract positive funding payments from position margin
- Add negative funding payments to position margin
- Update position.last_funding_payment to current timestamp

## Dependencies
- Existing MarketConfig structure with funding_rate and last_funding_update fields
- Existing Position structure with last_funding_payment field
- Admin authorization system
- Storage system for persistent data