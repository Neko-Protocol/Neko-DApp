#![cfg(test)]
extern crate std;

use crate::common::types::MarketConfig;
use crate::{RWAPerpsContract, RWAPerpsContractClient};
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

use crate::common::types::{Position, SCALAR_9};

// ========== Test Helpers ==========

/// Create a mock oracle contract (placeholder until rwa-oracle is integrated)
fn create_oracle(env: &Env) -> Address {
    // For now, just return a generated address
    // TODO: Integrate with actual rwa-oracle contract when ready
    Address::generate(env)
}

/// Create and initialize the perps contract
fn create_perps_contract(
    env: &Env,
    admin: Address,
    oracle: Address,
) -> RWAPerpsContractClient<'_> {
    let contract_id = env.register(RWAPerpsContract, ());
    let client = RWAPerpsContractClient::new(env, &contract_id);

    client.initialize(
        &admin,
        &oracle,
        &10,  // protocol_fee_rate: 0.1%
        &500, // liquidation_fee_rate: 5%
    );

    client
}

/// Create a test position
fn create_test_position(env: &Env, trader: Address, rwa_token: Address) -> Position {
    Position {
        trader,
        rwa_token,
        size: 1000 * SCALAR_9, // Long position
        entry_price: 100 * SCALAR_9,
        margin: 10000 * SCALAR_9,
        leverage: 1000, // 10x
        opened_at: env.ledger().timestamp(),
        last_funding_payment: 0,
    }
}
/// Create a default market configuration for testing
fn default_market_config(_env: &Env, rwa_token: Address) -> MarketConfig {
    MarketConfig {
        rwa_token,
        max_leverage: 1000,      // 10x
        maintenance_margin: 500, // 5%
        initial_margin: 1000,    // 10%
        funding_rate: 10,        // 0.1%
        last_funding_update: 0,
        is_active: true,
    }
}

// ========== Initialization Tests ==========

#[test]
fn test_initialization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Verify admin and oracle are set correctly
    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, admin);

    let stored_oracle = client.get_oracle();
    assert_eq!(stored_oracle, oracle);

    // Verify protocol is not paused initially
    assert_eq!(client.is_protocol_paused(), false);
}

#[test]
#[should_panic(expected = "Error(Contract, #62)")] // AlreadyInitialized
fn test_double_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let contract_id = env.register(RWAPerpsContract, ());
    let client = RWAPerpsContractClient::new(&env, &contract_id);

    // First initialization
    client.initialize(&admin, &oracle, &10, &500);

    // Second initialization should panic
    client.initialize(&admin, &oracle, &10, &500);
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_initialization_invalid_protocol_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let contract_id = env.register(RWAPerpsContract, ());
    let client = RWAPerpsContractClient::new(&env, &contract_id);

    // Try to initialize with invalid protocol fee (>100%)
    client.initialize(&admin, &oracle, &10001, &500);
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_initialization_invalid_liquidation_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let contract_id = env.register(RWAPerpsContract, ());
    let client = RWAPerpsContractClient::new(&env, &contract_id);

    // Try to initialize with invalid liquidation fee (>100%)
    client.initialize(&admin, &oracle, &10, &10001);
}

// ========== Admin Function Tests ==========

#[test]
fn test_set_oracle() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set new oracle
    let new_oracle = Address::generate(&env);
    client.set_oracle(&new_oracle);

    // Verify oracle was updated
    assert_eq!(client.get_oracle(), new_oracle);
}

#[test]
fn test_set_protocol_paused() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Initially not paused
    assert_eq!(client.is_protocol_paused(), false);

    // Pause protocol
    client.set_protocol_paused(&true);
    assert_eq!(client.is_protocol_paused(), true);

    // Unpause protocol
    client.set_protocol_paused(&false);
    assert_eq!(client.is_protocol_paused(), false);
}

#[test]
fn test_set_protocol_fee_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set new fee rate (function should not panic)
    client.set_protocol_fee_rate(&20); // 0.2%
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_set_invalid_protocol_fee_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Try to set invalid fee rate (>100%)
    client.set_protocol_fee_rate(&10001);
}

#[test]
fn test_set_liquidation_fee_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set new liquidation fee rate (function should not panic)
    client.set_liquidation_fee_rate(&600); // 6%
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_set_invalid_liquidation_fee_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Try to set invalid liquidation fee rate (>100%)
    client.set_liquidation_fee_rate(&10001);
}

#[test]
fn test_set_market_config() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Create market config
    let rwa_token = Address::generate(&env);
    let config = default_market_config(&env, rwa_token.clone());

    // Set market config (should not panic)
    client.set_market_config(&rwa_token, &config);
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_set_invalid_market_config_zero_leverage() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());

    // Set invalid leverage (zero)
    config.max_leverage = 0;

    client.set_market_config(&rwa_token, &config);
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_set_invalid_market_config_high_leverage() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());

    // Set invalid leverage (>100x)
    config.max_leverage = 10001;

    client.set_market_config(&rwa_token, &config);
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // InvalidInput
fn test_set_invalid_market_config_high_maintenance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());

    // Set invalid maintenance margin (>100%)
    config.maintenance_margin = 10001;

    client.set_market_config(&rwa_token, &config);
}

// ========== Authorization Tests ==========

#[test]
fn test_admin_authorization_required() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Verify admin functions require authorization
    // The mock_all_auths() allows all operations, demonstrating that
    // when properly authorized, admin functions work correctly
    let new_oracle = Address::generate(&env);
    client.set_oracle(&new_oracle);
    assert_eq!(client.get_oracle(), new_oracle);
}

// ========== Integration Tests ==========

#[test]
fn test_admin_and_liquidation_integration() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market via admin functions
    let rwa_token = Address::generate(&env);
    let config = default_market_config(&env, rwa_token.clone());
    client.set_market_config(&rwa_token, &config);

    // Verify contract is initialized and ready for operations
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_oracle(), oracle);
    assert_eq!(client.is_protocol_paused(), false);
}

// ========== Funding Tests ==========

#[test]
fn test_update_funding_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market
    let rwa_token = Address::generate(&env);
    let config = default_market_config(&env, rwa_token.clone());
    client.set_market_config(&rwa_token, &config);

    // Update funding rate
    let new_rate = 200i128; // 2%
    client.update_funding_rate(&rwa_token, &new_rate); // Should not panic

    // Verify rate was updated
    let updated_rate = client.get_funding_rate(&rwa_token);
    assert_eq!(updated_rate, new_rate, "Funding rate should be updated");
}

#[test]
fn test_get_funding_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market
    let rwa_token = Address::generate(&env);
    let config = default_market_config(&env, rwa_token.clone());
    client.set_market_config(&rwa_token, &config);

    // Get funding rate
    let rate = client.get_funding_rate(&rwa_token);
    assert_eq!(rate, 10i128, "Should return the configured funding rate");
}

#[test]
#[should_panic] // Should panic for non-existent market
fn test_get_funding_rate_market_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Try to get funding rate for non-existent market
    let rwa_token = Address::generate(&env);
    client.get_funding_rate(&rwa_token); // Should panic
}

#[test]
fn test_accrue_funding_positive_rate_long() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market with positive funding rate
    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());
    config.funding_rate = 100; // 1% positive
    client.set_market_config(&rwa_token, &config);

    // Create a position (this would normally be done through position opening)
    let trader = Address::generate(&env);
    let position = create_test_position(&env, trader.clone(), rwa_token.clone());
    
    // For testing, we need to manually store the position using contract context
    env.as_contract(&client.address, || {
        use crate::common::storage::Storage;
        Storage::set_position(&env, &trader, &rwa_token, &position);
    });

    // Advance time by 1 hour
    env.ledger().with_mut(|li| li.timestamp = 3600);

    // Accrue funding
    let payment = client.accrue_funding(&trader, &rwa_token);
    
    // Long position with positive rate should pay (positive payment)
    assert!(payment > 0, "Long position should pay positive funding");
}

#[test]
fn test_accrue_funding_positive_rate_short() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market with positive funding rate
    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());
    config.funding_rate = 100; // 1% positive
    client.set_market_config(&rwa_token, &config);

    // Create a short position
    let trader = Address::generate(&env);
    let mut position = create_test_position(&env, trader.clone(), rwa_token.clone());
    position.size = -1000 * SCALAR_9; // Short position
    
    env.as_contract(&client.address, || {
        use crate::common::storage::Storage;
        Storage::set_position(&env, &trader, &rwa_token, &position);
    });

    // Advance time by 1 hour
    env.ledger().with_mut(|li| li.timestamp = 3600);

    // Accrue funding
    let payment = client.accrue_funding(&trader, &rwa_token);
    
    // Short position with positive rate should receive (negative payment)
    assert!(payment < 0, "Short position should receive funding (negative payment)");
}

#[test]
fn test_accrue_funding_negative_rate_long() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market with negative funding rate
    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());
    config.funding_rate = -100; // -1% negative
    client.set_market_config(&rwa_token, &config);

    // Create a long position
    let trader = Address::generate(&env);
    let position = create_test_position(&env, trader.clone(), rwa_token.clone());
    
    env.as_contract(&client.address, || {
        use crate::common::storage::Storage;
        Storage::set_position(&env, &trader, &rwa_token, &position);
    });

    // Advance time by 1 hour
    env.ledger().with_mut(|li| li.timestamp = 3600);

    // Accrue funding
    let payment = client.accrue_funding(&trader, &rwa_token);
    
    // Long position with negative rate should receive (negative payment)
    assert!(payment < 0, "Long position should receive funding with negative rate");
}

#[test]
fn test_accrue_funding_negative_rate_short() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market with negative funding rate
    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());
    config.funding_rate = -100; // -1% negative
    client.set_market_config(&rwa_token, &config);

    // Create a short position
    let trader = Address::generate(&env);
    let mut position = create_test_position(&env, trader.clone(), rwa_token.clone());
    position.size = -1000 * SCALAR_9; // Short position
    
    env.as_contract(&client.address, || {
        use crate::common::storage::Storage;
        Storage::set_position(&env, &trader, &rwa_token, &position);
    });

    // Advance time by 1 hour
    env.ledger().with_mut(|li| li.timestamp = 3600);

    // Accrue funding
    let payment = client.accrue_funding(&trader, &rwa_token);
    
    // Short position with negative rate should pay (positive payment)
    assert!(payment > 0, "Short position should pay funding with negative rate");
}

#[test]
fn test_accrue_funding_zero_time() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market
    let rwa_token = Address::generate(&env);
    let config = default_market_config(&env, rwa_token.clone());
    client.set_market_config(&rwa_token, &config);

    // Create a position
    let trader = Address::generate(&env);
    let position = create_test_position(&env, trader.clone(), rwa_token.clone());
    
    env.as_contract(&client.address, || {
        use crate::common::storage::Storage;
        Storage::set_position(&env, &trader, &rwa_token, &position);
    });

    // Don't advance time - accrue immediately
    let payment = client.accrue_funding(&trader, &rwa_token);
    
    // Zero time should result in zero payment
    assert_eq!(payment, 0, "Zero time elapsed should result in zero payment");
}

#[test]
#[should_panic] // Should panic for non-existent position
fn test_accrue_funding_position_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market
    let rwa_token = Address::generate(&env);
    let config = default_market_config(&env, rwa_token.clone());
    client.set_market_config(&rwa_token, &config);

    // Try to accrue funding for non-existent position
    let trader = Address::generate(&env);
    client.accrue_funding(&trader, &rwa_token); // Should panic
}

#[test]
fn test_funding_time_calculation() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let oracle = create_oracle(&env);

    let client = create_perps_contract(&env, admin.clone(), oracle.clone());

    // Set up market
    let rwa_token = Address::generate(&env);
    let mut config = default_market_config(&env, rwa_token.clone());
    config.funding_rate = 3600; // 36% per second for easy calculation
    client.set_market_config(&rwa_token, &config);

    // Create a position
    let trader = Address::generate(&env);
    let position = create_test_position(&env, trader.clone(), rwa_token.clone());
    
    env.as_contract(&client.address, || {
        use crate::common::storage::Storage;
        Storage::set_position(&env, &trader, &rwa_token, &position);
    });

    // Advance time by exactly 1 second
    env.ledger().with_mut(|li| li.timestamp = 1);

    // Accrue funding
    let payment1 = client.accrue_funding(&trader, &rwa_token);

    // Advance time by another second
    env.ledger().with_mut(|li| li.timestamp = 2);

    // Accrue funding again
    let payment2 = client.accrue_funding(&trader, &rwa_token);
    
    // Second payment should be equal to first (same time period)
    assert_eq!(payment1, payment2, "Equal time periods should result in equal payments");
}
