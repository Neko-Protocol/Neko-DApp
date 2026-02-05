#![cfg(test)]
extern crate std;

use crate::Error;
use crate::contract::{RWATokenContract, RWATokenContractClient};
use crate::rwa_oracle;
use rwa_oracle::Asset;
use rwa_oracle::{RWAMetadata, RWAAssetType, TokenizationInfo, ValuationMethod};
use soroban_sdk::{
    Address, Env, String, Symbol, Vec,
    testutils::{Address as _, Ledger},
    vec,
};

fn create_oracle(e: &Env) -> (rwa_oracle::Client<'_>, Address) {
    let asset_nvda = Asset::Other(Symbol::new(e, "NVDA"));
    let asset_usdc = Asset::Other(Symbol::new(e, "USDC"));
    let assets = vec![e, asset_nvda.clone(), asset_usdc.clone()];
    let admin = Address::generate(e);

    let contract_address = e.register(
        rwa_oracle::WASM,
        (admin.clone(), assets.clone(), asset_usdc.clone(), 14u32, 300u32),
    );

    let client = rwa_oracle::Client::new(e, &contract_address);

    (client, contract_address)
}

fn create_token_contract<'a>(
    e: &Env,
    admin: Address,
    oracle: Address,
    pegged_asset: Symbol,
    name: String,
    symbol: String,
    decimals: u32,
) -> RWATokenContractClient<'a> {
    let contract_id = e.register(
        RWATokenContract,
        (admin, oracle, pegged_asset, name, symbol, decimals),
    );

    RWATokenContractClient::new(e, &contract_id)
}

#[test]
fn test_token_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");
    let decimals: u32 = 7;

    let token = create_token_contract(
        &e,
        admin.clone(),
        oracle_address.clone(),
        pegged_asset.clone(),
        name.clone(),
        symbol.clone(),
        decimals,
    );

    assert_eq!(token.symbol(), symbol);
    assert_eq!(token.name(), name);
    assert_eq!(token.decimals(), decimals);
    assert_eq!(token.pegged_asset(), pegged_asset.clone());
    let contract_addr = token.asset_contract();
    assert_eq!(contract_addr, oracle_address);

    let retrieved_admin = token.admin();
    assert_eq!(retrieved_admin, admin);

    // Total supply starts at zero
    assert_eq!(token.total_supply(), 0);

    // No compliance or identity verifier by default
    assert_eq!(token.compliance(), None);
    assert_eq!(token.identity_verifier(), None);
}

#[test]
fn test_token_transfers() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Authorize both addresses for transfers
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &true);

    // Mint tokens to Alice
    token.mint(&alice, &1000_0000000);

    assert_eq!(token.balance(&alice), 1000_0000000);
    assert_eq!(token.balance(&bob), 0);
    assert_eq!(token.total_supply(), 1000_0000000);

    // Transfer from Alice to Bob
    token.transfer(&alice, &bob, &500_0000000);

    assert_eq!(token.balance(&alice), 500_0000000);
    assert_eq!(token.balance(&bob), 500_0000000);
    // Total supply unchanged after transfer
    assert_eq!(token.total_supply(), 1000_0000000);
}

#[test]
fn test_allowances() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    let carol = Address::generate(&e);

    // Authorize all addresses
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &true);
    token.set_authorized(&carol, &true);

    // Mint tokens to Alice
    token.mint(&alice, &2000_0000000);
    assert_eq!(token.balance(&alice), 2000_0000000);

    // Alice approves Carol to spend tokens
    let live_until = e.ledger().sequence() + 1000;
    token.approve(&alice, &carol, &1000_0000000, &live_until);
    assert_eq!(token.allowance(&alice, &carol), 1000_0000000);

    // Carol transfers from Alice to Bob using allowance
    token.transfer_from(&carol, &alice, &bob, &500_0000000);

    // Verify allowance was decreased
    assert_eq!(token.allowance(&alice, &carol), 500_0000000);

    // Verify balances
    assert_eq!(token.balance(&alice), 1500_0000000);
    assert_eq!(token.balance(&bob), 500_0000000);
    assert_eq!(token.balance(&carol), 0);
}

#[test]
fn test_increase_decrease_allowance() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Mint tokens to Alice
    token.mint(&alice, &2000_0000000);

    // Approve initial amount
    let live_until = e.ledger().sequence() + 1000;
    token.approve(&alice, &bob, &500_0000000, &live_until);
    assert_eq!(token.allowance(&alice, &bob), 500_0000000);

    // Increase allowance
    token.increase_allowance(&alice, &bob, &300_0000000);
    assert_eq!(token.allowance(&alice, &bob), 800_0000000);

    // Decrease allowance
    token.decrease_allowance(&alice, &bob, &200_0000000);
    assert_eq!(token.allowance(&alice, &bob), 600_0000000);
}

#[test]
fn test_burn() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);

    // Mint tokens to Alice
    token.mint(&alice, &1000_0000000);
    assert_eq!(token.balance(&alice), 1000_0000000);
    assert_eq!(token.total_supply(), 1000_0000000);

    // Burn tokens
    token.burn(&alice, &300_0000000);
    assert_eq!(token.balance(&alice), 700_0000000);
    assert_eq!(token.total_supply(), 700_0000000);

    // Burn from using allowance
    let bob = Address::generate(&e);
    token.mint(&bob, &1000_0000000);
    assert_eq!(token.total_supply(), 1700_0000000);

    let live_until = e.ledger().sequence() + 1000;
    token.approve(&bob, &alice, &500_0000000, &live_until);

    token.burn_from(&alice, &bob, &200_0000000);
    assert_eq!(token.balance(&bob), 800_0000000);
    assert_eq!(token.allowance(&bob, &alice), 300_0000000);
    assert_eq!(token.total_supply(), 1500_0000000);
}

#[test]
fn test_clawback() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);

    // Mint tokens to Alice
    token.mint(&alice, &1000_0000000);
    assert_eq!(token.balance(&alice), 1000_0000000);
    assert_eq!(token.total_supply(), 1000_0000000);

    // Admin clawbacks tokens
    token.clawback(&alice, &300_0000000);
    assert_eq!(token.balance(&alice), 700_0000000);
    assert_eq!(token.total_supply(), 700_0000000);
}

#[test]
fn test_authorization_and_freeze() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Check default authorization (should be false)
    assert_eq!(token.authorized(&alice), false);

    // Set authorization to true
    token.set_authorized(&alice, &true);
    assert_eq!(token.authorized(&alice), true);

    // Set authorization to false (freeze)
    token.set_authorized(&alice, &false);
    assert_eq!(token.authorized(&alice), false);

    // Frozen address cannot transfer: authorize alice, freeze bob
    token.set_authorized(&alice, &true);
    token.mint(&alice, &1000_0000000);

    // Bob is not authorized — transfer should fail
    let result = token.try_transfer(&alice, &bob, &100_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AddressFrozen.into()
    );

    // Authorize bob — transfer should succeed
    token.set_authorized(&bob, &true);
    token.transfer(&alice, &bob, &100_0000000);
    assert_eq!(token.balance(&bob), 100_0000000);

    // Freeze alice — transfer from alice should fail
    token.set_authorized(&alice, &false);
    let result = token.try_transfer(&alice, &bob, &100_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AddressFrozen.into()
    );
}

#[test]
fn test_freeze_enforcement_transfer_from() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    let carol = Address::generate(&e);

    // Authorize everyone and mint
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &true);
    token.set_authorized(&carol, &true);
    token.mint(&alice, &1000_0000000);

    // Alice approves carol
    let live_until = e.ledger().sequence() + 1000;
    token.approve(&alice, &carol, &500_0000000, &live_until);

    // Freeze alice — transfer_from should fail
    token.set_authorized(&alice, &false);
    let result = token.try_transfer_from(&carol, &alice, &bob, &100_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AddressFrozen.into()
    );

    // Unfreeze alice, freeze bob (receiver) — should also fail
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &false);
    let result = token.try_transfer_from(&carol, &alice, &bob, &100_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AddressFrozen.into()
    );
}

#[test]
fn test_sep57_compliance_and_identity_setters() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    // Initially no compliance or identity verifier
    assert_eq!(token.compliance(), None);
    assert_eq!(token.identity_verifier(), None);

    // Set compliance contract
    let compliance_addr = Address::generate(&e);
    token.set_compliance(&compliance_addr);
    assert_eq!(token.compliance(), Some(compliance_addr.clone()));

    // Set identity verifier contract
    let identity_addr = Address::generate(&e);
    token.set_identity_verifier(&identity_addr);
    assert_eq!(token.identity_verifier(), Some(identity_addr.clone()));
}

#[test]
fn test_total_supply_tracking() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Initial supply is zero
    assert_eq!(token.total_supply(), 0);

    // Mint increases supply
    token.mint(&alice, &1000_0000000);
    assert_eq!(token.total_supply(), 1000_0000000);

    token.mint(&bob, &500_0000000);
    assert_eq!(token.total_supply(), 1500_0000000);

    // Burn decreases supply
    token.burn(&alice, &200_0000000);
    assert_eq!(token.total_supply(), 1300_0000000);

    // Burn from decreases supply
    let live_until = e.ledger().sequence() + 1000;
    token.approve(&bob, &alice, &300_0000000, &live_until);
    token.burn_from(&alice, &bob, &100_0000000);
    assert_eq!(token.total_supply(), 1200_0000000);

    // Clawback decreases supply
    token.clawback(&alice, &200_0000000);
    assert_eq!(token.total_supply(), 1000_0000000);
}

#[test]
fn test_price_functions() {
    let e = Env::default();
    e.mock_all_auths();

    let (oracle_client, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset.clone(),
        name,
        symbol,
        7,
    );

    // Set ledger timestamp so the oracle accepts the price timestamp
    let timestamp = 1700000000u64;
    e.ledger().with_mut(|li| {
        li.timestamp = timestamp;
    });

    // Set a price for NVDA in the oracle
    let nvda_asset = Asset::Other(pegged_asset.clone());
    let price = 500_000_000_000_000i128; // $500.00 with 14 decimals

    oracle_client.set_asset_price(&nvda_asset, &price, &timestamp);

    // Get the price
    let price_data_result = token.try_get_price();
    if let Ok(Ok(price_data)) = price_data_result {
        assert_eq!(price_data.price, price);
        assert_eq!(price_data.timestamp, timestamp);
    }

    // Get price at specific timestamp
    let price_data_at_result = token.try_get_price_at(&timestamp);
    if let Ok(Ok(price_data_at)) = price_data_at_result {
        assert_eq!(price_data_at.price, price);
        assert_eq!(price_data_at.timestamp, timestamp);
    }

    // Get oracle decimals
    let decimals_result = token.try_oracle_decimals();
    if let Ok(Ok(decimals)) = decimals_result {
        assert_eq!(decimals, 14u32);
    }
}

#[test]
fn test_rwa_metadata() {
    let e = Env::default();
    e.mock_all_auths();

    let (oracle_client, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin.clone(),
        oracle_address,
        pegged_asset.clone(),
        name,
        symbol,
        7,
    );

    // Set RWA metadata in oracle (using new schema)
    let tokenization_info = TokenizationInfo {
        token_contract: Some(token.address.clone()),
        total_supply: None,
        underlying_asset_id: Some(String::from_str(&e, "NVDA-STOCK")),
        tokenization_date: Some(e.ledger().timestamp()),
    };

    let metadata = RWAMetadata {
        asset_id: pegged_asset.clone(),
        name: String::from_str(&e, "NVIDIA Corporation Token"),
        description: String::from_str(&e, "NVIDIA Corporation common stock"),
        asset_type: RWAAssetType::Equity,
        underlying_asset: String::from_str(&e, "NVDA Stock"),
        issuer: admin.clone(),
        jurisdiction: Symbol::new(&e, "US"),
        tokenization_info: tokenization_info.clone(),
        external_ids: Vec::new(&e),
        legal_docs_uri: None,
        valuation_method: ValuationMethod::Market,
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    oracle_client.set_rwa_metadata(&pegged_asset, &metadata);

    // Get metadata
    let retrieved_metadata_result = token.try_get_rwa_metadata();
    if let Ok(Ok(retrieved_metadata)) = retrieved_metadata_result {
        assert_eq!(retrieved_metadata.asset_type, RWAAssetType::Equity);
        assert_eq!(retrieved_metadata.asset_id, pegged_asset);
        assert_eq!(retrieved_metadata.jurisdiction, Symbol::new(&e, "US"));
        assert_eq!(retrieved_metadata.valuation_method, ValuationMethod::Market);
    }

    // Get asset type
    let asset_type_result = token.try_get_asset_type();
    if let Ok(Ok(asset_type)) = asset_type_result {
        assert_eq!(asset_type, RWAAssetType::Equity);
    }
}

#[test]
fn test_error_handling() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Authorize both
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &true);

    // Try to transfer more than balance (should fail with InsufficientBalance)
    let result = token.try_transfer(&alice, &bob, &1000_0000000);
    assert!(result.is_err());

    // Mint tokens to Alice
    token.mint(&alice, &500_0000000);

    // Try to transfer to self (should fail)
    let result = token.try_transfer(&alice, &alice, &1000_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::CannotTransferToSelf.into()
    );

    // Try to transfer more than balance
    let result = token.try_transfer(&alice, &bob, &6000_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::InsufficientBalance.into()
    );
}

#[test]
fn test_transfer_from_checks_balance() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    let carol = Address::generate(&e);

    // Authorize all
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &true);
    token.set_authorized(&carol, &true);

    // Mint tokens to Bob
    token.mint(&bob, &1000_0000000);
    assert_eq!(token.balance(&bob), 1000_0000000);

    // Bob approves Carol to spend tokens
    let live_until = e.ledger().sequence() + 1000;
    token.approve(&bob, &carol, &1000_0000000, &live_until);
    assert_eq!(token.allowance(&bob, &carol), 1000_0000000);

    // Carol tries to transfer more than Bob's balance (but also more than allowance)
    // Allowance check happens before balance check, so we get InsufficientAllowance
    let result = token.try_transfer_from(&carol, &bob, &alice, &2000_0000000);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::InsufficientAllowance.into()
    );
}

#[test]
fn test_exact_allowance_usage() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    let carol = Address::generate(&e);

    // Authorize all
    token.set_authorized(&alice, &true);
    token.set_authorized(&bob, &true);
    token.set_authorized(&carol, &true);

    // Mint tokens to Bob
    token.mint(&bob, &2000_0000000);
    assert_eq!(token.balance(&bob), 2000_0000000);

    // Bob approves Carol to spend tokens
    let live_until = e.ledger().sequence() + 1000;
    token.approve(&bob, &carol, &1000_0000000, &live_until);
    assert_eq!(token.allowance(&bob, &carol), 1000_0000000);

    // Carol transfers exact allowance amount
    token.transfer_from(&carol, &bob, &alice, &1000_0000000);

    // Verify allowance is now zero
    assert_eq!(token.allowance(&bob, &carol), 0);

    // Try to decrease allowance below zero (should handle gracefully)
    token.decrease_allowance(&bob, &carol, &1000_0000000);
    assert_eq!(token.allowance(&bob, &carol), 0);
}

#[test]
fn test_spendable_balance() {
    let e = Env::default();
    e.mock_all_auths();

    let (_, oracle_address) = create_oracle(&e);
    let admin: Address = Address::generate(&e);

    let pegged_asset = Symbol::new(&e, "NVDA");
    let name = String::from_str(&e, "NVIDIA Corporation Token");
    let symbol = String::from_str(&e, "NVDA");

    let token = create_token_contract(
        &e,
        admin,
        oracle_address,
        pegged_asset,
        name,
        symbol,
        7,
    );

    let alice = Address::generate(&e);

    // Mint tokens
    token.mint(&alice, &1000_0000000);

    // Spendable balance should equal balance
    assert_eq!(token.spendable_balance(&alice), token.balance(&alice));
    assert_eq!(token.spendable_balance(&alice), 1000_0000000);
}
