# Funding Rate System Implementation Tasks

## Task Overview
Implement the funding rate system for RWA perpetuals as specified in GitHub issue #11.

## Implementation Tasks

### 1. Core Implementation

- [x] 1.1 Create funding operations module
  - [x] 1.1.1 Create `apps/contracts/stellar-contracts/rwa-perps/src/operations/funding.rs`
  - [x] 1.1.2 Implement `Funding` struct with required methods
  - [x] 1.1.3 Add module import to `operations/mod.rs`

- [x] 1.2 Implement `update_funding_rate()` function
  - [x] 1.2.1 Add function signature accepting RWA token and new funding rate
  - [x] 1.2.2 Implement admin authorization validation
  - [x] 1.2.3 Update MarketConfig with new rate and timestamp
  - [x] 1.2.4 Save updated MarketConfig to storage

- [x] 1.3 Implement `accrue_funding()` function  
  - [x] 1.3.1 Add function signature accepting trader and RWA token
  - [x] 1.3.2 Get position and market config from storage
  - [x] 1.3.3 Calculate funding payment using helper function
  - [x] 1.3.4 Update position margin (deduct if positive, add if negative)
  - [x] 1.3.5 Update last_funding_payment timestamp
  - [x] 1.3.6 Save updated position to storage

- [x] 1.4 Implement `get_funding_rate()` function
  - [x] 1.4.1 Add function signature accepting RWA token
  - [x] 1.4.2 Get market config from storage
  - [x] 1.4.3 Return funding rate from MarketConfig

- [x] 1.5 Implement `calculate_funding_payment()` helper
  - [x] 1.5.1 Add pure function signature with position, market config, and time
  - [x] 1.5.2 Calculate time elapsed since last funding payment
  - [x] 1.5.3 Apply formula: `funding_payment = position_size * funding_rate * time_elapsed / BASIS_POINTS`
  - [x] 1.5.4 Return calculated payment amount

### 2. Error Handling

- [x] 2.1 Add funding-related errors
  - [x] 2.1.1 Add `InvalidFundingRate = 70` to Error enum
  - [x] 2.1.2 Add `FundingCalculationError = 71` to Error enum

### 3. Contract Integration

- [ ] 3.1 Add funding functions to main contract
  - [ ] 3.1.1 Import Funding module in `contract.rs`
  - [ ] 3.1.2 Add `update_funding_rate()` public function
  - [ ] 3.1.3 Add `accrue_funding()` public function  
  - [ ] 3.1.4 Add `get_funding_rate()` public function

### 4. Optional Features

- [ ] 4.1 Implement funding payment history storage
  - [ ] 4.1.1 Create storage function for FundingPayment records
  - [ ] 4.1.2 Store payment history in `accrue_funding()`
  - [ ] 4.1.3 Add function to retrieve payment history

### 5. Testing Implementation

- [ ] 5.1 Create comprehensive test suite
  - [ ] 5.1.1 Add funding tests to `src/test/mod.rs`
  - [ ] 5.1.2 Create test helper functions for setup

- [ ] 5.2 Test admin authorization
  - [ ] 5.2.1 Test admin can update funding rates
  - [ ] 5.2.2 Test non-admin cannot update funding rates

- [ ] 5.3 Test positive funding rate scenarios
  - [ ] 5.3.1 Test long position pays funding (positive payment)
  - [ ] 5.3.2 Test short position receives funding (negative payment)
  - [ ] 5.3.3 Test margin updates correctly for positive rates

- [ ] 5.4 Test negative funding rate scenarios  
  - [ ] 5.4.1 Test long position receives funding (negative payment)
  - [ ] 5.4.2 Test short position pays funding (positive payment)
  - [ ] 5.4.3 Test margin updates correctly for negative rates

- [ ] 5.5 Test time-based calculations
  - [ ] 5.5.1 Test funding accrual over different time periods
  - [ ] 5.5.2 Test zero time elapsed returns zero payment
  - [ ] 5.5.3 Test new positions (last_funding_payment = 0)

- [ ] 5.6 Test edge cases
  - [ ] 5.6.1 Test zero position size
  - [ ] 5.6.2 Test zero funding rate
  - [ ] 5.6.3 Test market not found scenarios

- [ ] 5.7 Test funding rate retrieval
  - [ ] 5.7.1 Test get_funding_rate returns correct rate
  - [ ] 5.7.2 Test get_funding_rate for non-existent market

- [ ] 5.8 Verify all tests pass
  - [ ] 5.8.1 Run test suite and ensure 100% pass rate
  - [ ] 5.8.2 Verify test coverage includes all acceptance criteria

## Acceptance Validation

### Validation Checklist
- [ ] ✅ Funding rates can be updated by admin
- [ ] ✅ Funding payments are calculated correctly (positive = trader pays, negative = trader receives)  
- [ ] ✅ Funding accrues based on time elapsed since last payment
- [ ] ✅ All functions have comprehensive tests that pass successfully
- [ ] ✅ Tests cover positive/negative funding rates, time calculations, etc.

### File Structure Validation
- [ ] ✅ `apps/contracts/stellar-contracts/rwa-perps/src/operations/funding.rs` created
- [ ] ✅ `apps/contracts/stellar-contracts/rwa-perps/src/common/error.rs` updated with funding errors
- [ ] ✅ `apps/contracts/stellar-contracts/rwa-perps/src/test/mod.rs` updated with funding tests

## Implementation Notes

### Formula Implementation
- Use exact formula: `funding_payment = position_size * funding_rate * time_elapsed`
- Divide by BASIS_POINTS (10000) to convert from basis points
- Time elapsed in seconds using ledger timestamp

### Payment Direction Logic
- Positive payment = trader pays funding (deduct from margin)
- Negative payment = trader receives funding (add to margin)
- Long positions: payment sign matches funding rate sign
- Short positions: payment sign opposite to funding rate sign

### Time Calculation
- Use `env.ledger().timestamp()` for current time
- Calculate elapsed as: `current_time - position.last_funding_payment`
- Handle new positions where `last_funding_payment = 0` by using `position.opened_at`

### Storage Integration
- Use existing Storage struct methods
- Update MarketConfig for rate changes
- Update Position for funding accrual
- Optionally store FundingPayment records for history