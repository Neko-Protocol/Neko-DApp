use soroban_sdk::{assert_with_error, Address, Env, token::TokenClient};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{BACKSTOP_WITHDRAWAL_QUEUE_SECONDS, PoolState};

/// Backstop Module for first-loss capital
pub struct Backstop;

impl Backstop {
    /// Deposit to backstop
    pub fn deposit(env: &Env, depositor: &Address, amount: i128) -> Result<(), Error> {
        depositor.require_auth();

        assert_with_error!(env, amount > 0, Error::NotPositive);

        // Transfer tokens from depositor to contract
        let storage = Storage::get(env);
        let token_address = storage.backstop_token
            .ok_or(Error::TokenContractNotSet)?;
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(depositor, &env.current_contract_address(), &amount);

        // Update backstop deposit
        let mut storage = Storage::get(env);
        let mut deposit = storage
            .backstop_deposits
            .get(depositor.clone())
            .unwrap_or(crate::common::types::BackstopDeposit {
                amount: 0,
                deposited_at: env.ledger().timestamp(),
                in_withdrawal_queue: false,
                queued_at: None,
            });

        deposit.amount = deposit.amount + amount;
        deposit.deposited_at = env.ledger().timestamp();
        deposit.in_withdrawal_queue = false;
        deposit.queued_at = None;

        storage.backstop_deposits.set(depositor.clone(), deposit);
        storage.backstop_total = storage.backstop_total + amount;
        Storage::set(env, &storage);

        // Update pool state based on backstop
        Self::update_pool_state(env)?;

        Ok(())
    }

    /// Initiate withdrawal from backstop (enters queue)
    #[allow(dead_code)]
    pub fn initiate_withdrawal(env: &Env, depositor: &Address, amount: i128) -> Result<(), Error> {
        depositor.require_auth();

        assert_with_error!(env, amount > 0, Error::NotPositive);

        let mut storage = Storage::get(env);
        let mut deposit = storage
            .backstop_deposits
            .get(depositor.clone())
            .ok_or(Error::InsufficientBackstopDeposit)?;

        if deposit.amount < amount {
            return Err(Error::InsufficientBackstopDeposit);
        }

        // Add to withdrawal queue
        let withdrawal_request = crate::common::types::WithdrawalRequest {
            address: depositor.clone(),
            amount,
            queued_at: env.ledger().timestamp(),
        };

        storage.withdrawal_queue.push_back(withdrawal_request);
        deposit.in_withdrawal_queue = true;
        deposit.queued_at = Some(env.ledger().timestamp());

        storage.backstop_deposits.set(depositor.clone(), deposit);
        Storage::set(env, &storage);

        // Update pool state
        Self::update_pool_state(env)?;

        Ok(())
    }

    /// Withdraw from backstop (after queue period)
    pub fn withdraw(env: &Env, depositor: &Address, amount: i128) -> Result<(), Error> {
        depositor.require_auth();

        assert_with_error!(env, amount > 0, Error::NotPositive);

        let mut storage = Storage::get(env);
        let mut deposit = storage
            .backstop_deposits
            .get(depositor.clone())
            .ok_or(Error::InsufficientBackstopDeposit)?;

        if !deposit.in_withdrawal_queue {
            return Err(Error::WithdrawalQueueNotExpired);
        }

        let queued_at = deposit.queued_at.ok_or(Error::WithdrawalQueueNotExpired)?;
        let current_time = env.ledger().timestamp();

        if current_time < queued_at + BACKSTOP_WITHDRAWAL_QUEUE_SECONDS {
            return Err(Error::WithdrawalQueueNotExpired);
        }

        if deposit.amount < amount {
            return Err(Error::InsufficientBackstopDeposit);
        }

        // Check for bad debt
        // If there's bad debt, withdrawal might be restricted
        // For now, we'll allow withdrawal

        // Update deposit
        deposit.amount = deposit.amount - amount;
        deposit.in_withdrawal_queue = false;
        deposit.queued_at = None;

        // Get token address before updating storage
        let token_address = storage.backstop_token
            .clone()
            .ok_or(Error::TokenContractNotSet)?;

        storage.backstop_deposits.set(depositor.clone(), deposit);
        storage.backstop_total = storage.backstop_total - amount;
        Storage::set(env, &storage);

        // Transfer tokens from contract to depositor
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(&env.current_contract_address(), depositor, &amount);

        // Update pool state
        Self::update_pool_state(env)?;

        Ok(())
    }

    /// Update pool state based on backstop status
    fn update_pool_state(env: &Env) -> Result<(), Error> {
        let storage = Storage::get(env);

        // Calculate queued withdrawals percentage
        let queued_withdrawals: i128 = storage
            .withdrawal_queue
            .iter()
            .map(|req| req.amount)
            .sum();

        let queued_percentage = if storage.backstop_total > 0 {
            (queued_withdrawals * 10_000) / storage.backstop_total
        } else {
            0
        };

        let new_state = if queued_percentage >= 5000 {
            // 50% or more in withdrawal queue
            PoolState::Frozen
        } else if queued_percentage >= 2500 || storage.backstop_total < storage.backstop_threshold {
            // 25% or more in queue, or below threshold
            PoolState::OnIce
        } else {
            // Healthy
            PoolState::Active
        };

        // Only update if state changed
        if storage.pool_state != new_state {
            Admin::set_pool_state(env, new_state);
        }

        Ok(())
    }

    /// Get backstop deposit for a depositor
    #[allow(dead_code)]
    pub fn get_deposit(env: &Env, depositor: &Address) -> crate::common::types::BackstopDeposit {
        let storage = Storage::get(env);
        storage
            .backstop_deposits
            .get(depositor.clone())
            .unwrap_or(crate::common::types::BackstopDeposit {
                amount: 0,
                deposited_at: 0,
                in_withdrawal_queue: false,
                queued_at: None,
            })
    }

    /// Get total backstop deposits
    #[allow(dead_code)]
    pub fn get_total(env: &Env) -> i128 {
        let storage = Storage::get(env);
        storage.backstop_total
    }
}

