#![cfg(test)]
extern crate std;

use crate::common::types::{InterestRateParams, PoolState};
use crate::{LendingContract, LendingContractClient};
use crate::rwa_oracle;
use soroban_sdk::{
    symbol_short, testutils::Address as _, Address, Env, Symbol, vec,
};

// Helper: Create a test oracle contract
fn create_oracle(e: &Env) -> (rwa_oracle::Client<'_>, Address) {
    let asset_nvda = rwa_oracle::Asset::Other(Symbol::new(e, "NVDA"));
    let asset_usdc = rwa_oracle::Asset::Other(Symbol::new(e, "USDC"));
    let assets = vec![e, asset_nvda.clone(), asset_usdc.clone()];
    let admin = Address::generate(e);
    
    let contract_address = e.register(
        rwa_oracle::WASM,
        (admin.clone(), assets.clone(), asset_usdc.clone(), 14u32, 300u32),
    );
    
    let client = rwa_oracle::Client::new(e, &contract_address);
    
    (client, contract_address)
}

// Helper: Create and initialize lending contract
fn create_lending_contract(
    e: &Env,
    admin: Address,
    rwa_oracle: Address,
    reflector_oracle: Address,
) -> LendingContractClient<'_> {
    let contract_id = e.register(LendingContract, ());
    let client = LendingContractClient::new(e, &contract_id);
    
    client.initialize(
        &admin,
        &rwa_oracle,
        &reflector_oracle,
        &1_000_000_000_000,  // backstop_threshold: 1000 tokens
        &500_000,            // backstop_take_rate: 5% (7 decimals)
    );
    
    client
}

// Helper: Create default interest rate params (all values use 7 decimals)
fn default_interest_params() -> InterestRateParams {
    InterestRateParams {
        target_util: 7_500_000,        // 75%
        max_util: 9_500_000,           // 95%
        r_base: 100_000,               // 1%
        r_one: 500_000,                // 5%
        r_two: 5_000_000,              // 50%
        r_three: 15_000_000,           // 150%
        reactivity: 200,               // 0.00002
    }
}

#[test]
fn test_initialization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    // Check pool state (should be OnIce initially)
    let state = client.get_pool_state();
    assert_eq!(state, PoolState::OnIce);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_double_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let contract_id = env.register(LendingContract, ());
    let client = LendingContractClient::new(&env, &contract_id);
    
    client.initialize(
        &admin,
        &rwa_oracle,
        &reflector_oracle,
        &1_000_000_000_000,
        &500_000, // 5% (7 decimals)
    );

    // Try to initialize again
    client.initialize(
        &admin,
        &rwa_oracle,
        &reflector_oracle,
        &1_000_000_000_000,
        &500_000, // 5% (7 decimals)
    );
}

#[test]
fn test_set_interest_rate_params() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    let usdc = symbol_short!("USDC");
    let params = default_interest_params();
    
    client.set_interest_rate_params(&usdc, &params);
}

#[test]
fn test_set_pool_state() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    // Change to Active
    client.set_pool_state(&PoolState::Active);
    assert_eq!(client.get_pool_state(), PoolState::Active);
    
    // Change to Frozen
    client.set_pool_state(&PoolState::Frozen);
    assert_eq!(client.get_pool_state(), PoolState::Frozen);
}

#[test]
fn test_collateral_factor() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    let rwa_token = Address::generate(&env);
    let factor = 7_500_000; // 75% (7 decimals)

    // Set collateral factor
    client.set_collateral_factor(&rwa_token, &factor);
    
    // Get collateral factor
    let retrieved_factor = client.get_collateral_factor(&rwa_token);
    assert_eq!(retrieved_factor, factor);
}

#[test]
fn test_pool_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    // Set pool to Active
    client.set_pool_state(&PoolState::Active);
    
    let usdc = symbol_short!("USDC");
    
    client.set_interest_rate_params(&usdc, &default_interest_params());
    
    // Note: In a real test, you'd need to create token contracts and transfer tokens
    // For now, we just test that the function exists and pool balance is accessible
    let pool_balance = client.get_pool_balance(&usdc);
    assert_eq!(pool_balance, 0); // Initially zero
}

#[test]
fn test_b_token_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    let usdc = symbol_short!("USDC");
    
    client.set_interest_rate_params(&usdc, &default_interest_params());
    
    // Initial rate should be 1:1 (1e12 = SCALAR_12)
    let initial_rate = client.get_b_token_rate(&usdc);
    assert_eq!(initial_rate, 1_000_000_000_000);
}

#[test]
fn test_d_token_rate() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);
    
    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);
    
    let usdc = symbol_short!("USDC");
    
    client.set_interest_rate_params(&usdc, &default_interest_params());
    
    // Initial rate should be 1:1 (1e12 = SCALAR_12)
    let initial_rate = client.get_d_token_rate(&usdc);
    assert_eq!(initial_rate, 1_000_000_000_000);
}

#[test]
fn test_b_token_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let usdc = symbol_short!("USDC");

    client.set_interest_rate_params(&usdc, &default_interest_params());

    // Initial supply should be zero
    let initial_supply = client.get_b_token_supply(&usdc);
    assert_eq!(initial_supply, 0);
}

// ========== Bad Debt Auction Tests ==========

#[test]
fn test_has_bad_debt_no_cdp() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    // A user without CDP should not have bad debt
    let borrower = Address::generate(&env);
    let has_bad_debt = client.has_bad_debt(&borrower);
    assert_eq!(has_bad_debt, false);
}

#[test]
fn test_accumulated_interest_initial() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let usdc = symbol_short!("USDC");
    client.set_interest_rate_params(&usdc, &default_interest_params());

    // Initial accumulated interest should be zero
    let accumulated = client.get_accumulated_interest(&usdc);
    assert_eq!(accumulated, 0);
}

#[test]
fn test_can_create_interest_auction_no_interest() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let usdc = symbol_short!("USDC");
    client.set_interest_rate_params(&usdc, &default_interest_params());

    // Should not be able to create auction without enough accumulated interest
    let can_create = client.can_create_interest_auction(&usdc);
    assert_eq!(can_create, false);
}

#[test]
#[should_panic(expected = "Error(Contract, #62)")] // AuctionNotActive
fn test_create_interest_auction_insufficient_interest() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let usdc = symbol_short!("USDC");
    client.set_interest_rate_params(&usdc, &default_interest_params());

    // Try to create interest auction without enough interest - should panic
    client.create_interest_auction(&usdc);
}

#[test]
#[should_panic(expected = "Error(Contract, #60)")] // CDPNotInsolvent
fn test_create_bad_debt_auction_no_cdp() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let borrower = Address::generate(&env);
    let usdc = symbol_short!("USDC");

    // Try to create bad debt auction for user without CDP - should panic
    client.create_bad_debt_auction(&borrower, &usdc);
}

#[test]
#[should_panic(expected = "Error(Contract, #61)")] // AuctionNotFound
fn test_fill_bad_debt_auction_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let bidder = Address::generate(&env);

    // Try to fill non-existent auction - should panic
    client.fill_bad_debt_auction(&999u32, &bidder, &1000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #61)")] // AuctionNotFound
fn test_fill_interest_auction_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    let bidder = Address::generate(&env);
    let usdc = symbol_short!("USDC");
    let fill_percent = 5_000_000i128; // 50% (7 decimals)

    // Try to fill non-existent auction - should panic
    client.fill_interest_auction(&999u32, &bidder, &usdc, &fill_percent);
}

#[test]
fn test_backstop_token_setup() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let (_, rwa_oracle) = create_oracle(&env);
    let (_, reflector_oracle) = create_oracle(&env);

    let client = create_lending_contract(&env, admin.clone(), rwa_oracle, reflector_oracle);

    // Set backstop token
    let backstop_token = Address::generate(&env);
    client.set_backstop_token(&backstop_token);

    // Set token contract for USDC
    let usdc = symbol_short!("USDC");
    let usdc_token = Address::generate(&env);
    client.set_token_contract(&usdc, &usdc_token);

    // Verify pool is configured correctly
    assert_eq!(client.get_pool_state(), PoolState::OnIce);
}
