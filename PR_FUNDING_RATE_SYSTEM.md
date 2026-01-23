# PR: Implement Funding Rate System for RWA Perpetuals

## Summary
Implements the complete funding rate system for RWA perpetuals that periodically charges or pays traders based on market conditions to keep perpetual prices aligned with spot prices.

## Changes Made

### 🆕 New Files:
- `src/operations/funding.rs` - Complete funding operations module with all required functions

### 📝 Modified Files:
- `src/contract.rs` - Added funding function exports to contract interface
- `src/common/error.rs` - Added funding-related error codes (70-71)
- `src/operations/mod.rs` - Added funding module import
- `src/test/mod.rs` - Added comprehensive funding test suite

## Key Features Implemented

### ✅ Admin Functions:
- `update_funding_rate()` - Admin-only function to update market funding rates with timestamp tracking

### ✅ Core Funding Logic:
- `accrue_funding()` - Calculates and applies funding payments to positions
- `get_funding_rate()` - Retrieves current funding rate for markets
- `calculate_funding_payment()` - Pure helper function using exact formula: `position_size * funding_rate * time_elapsed`

### ✅ Payment Logic:
- Positive rates: Long positions pay, short positions receive
- Negative rates: Long positions receive, short positions pay
- Automatic margin updates and timestamp tracking

### ✅ Optional Features:
- Funding payment history storage for audit trails

## Testing
- **36 tests pass** including 11 funding-specific tests
- Comprehensive coverage: positive/negative rates, time calculations, edge cases, admin authorization
- Both unit tests (pure functions) and integration tests (full contract flow)

## Formula Implementation
Uses the exact specified formula with basis points conversion:
```rust
funding_payment = position_size * funding_rate * time_elapsed / BASIS_POINTS
```

## Files Changed
```
apps/contracts/stellar-contracts/rwa-perps/src/
├── operations/
│   ├── funding.rs          (NEW)
│   └── mod.rs              (MODIFIED)
├── common/
│   └── error.rs            (MODIFIED)
├── contract.rs             (MODIFIED)
└── test/mod.rs             (MODIFIED)
```

**Closes:** GitHub Issue #11 - Implement Funding Rate System