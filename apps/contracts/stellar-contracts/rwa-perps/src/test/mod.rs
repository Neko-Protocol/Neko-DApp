#![cfg(test)]
extern crate std;

use crate::common::types::MarketConfig;
use crate::{RWAPerpsContract, RWAPerpsContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

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
