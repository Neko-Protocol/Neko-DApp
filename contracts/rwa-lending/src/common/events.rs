use soroban_sdk::{contractevent, Address, Symbol};

/// Events emitted by the lending pool contract
#[contractevent]
pub struct DepositEvent {
    pub lender: Address,
    pub asset: Symbol,
    pub amount: i128,
    pub b_tokens: i128,
}

#[contractevent]
pub struct WithdrawEvent {
    pub lender: Address,
    pub asset: Symbol,
    pub amount: i128,
    pub b_tokens: i128,
}

#[contractevent]
pub struct BorrowEvent {
    pub borrower: Address,
    pub asset: Symbol,
    pub amount: i128,
    pub d_tokens: i128,
}

#[contractevent]
pub struct RepayEvent {
    pub borrower: Address,
    pub asset: Symbol,
    pub amount: i128,
    pub d_tokens: i128,
}

#[contractevent]
pub struct AddCollateralEvent {
    pub borrower: Address,
    pub rwa_token: Address,
    pub amount: i128,
}

#[contractevent]
pub struct RemoveCollateralEvent {
    pub borrower: Address,
    pub rwa_token: Address,
    pub amount: i128,
}

#[contractevent]
pub struct LiquidationInitiatedEvent {
    pub borrower: Address,
    pub rwa_token: Address,
    pub debt_asset: Symbol,
    pub collateral_amount: i128,
    pub debt_amount: i128,
    pub auction_id: Address,
}

#[contractevent]
pub struct LiquidationFilledEvent {
    pub auction_id: Address,
    pub liquidator: Address,
    pub collateral_received: i128,
    pub debt_paid: i128,
}

#[contractevent]
pub struct InterestAccruedEvent {
    pub asset: Symbol,
    pub b_token_rate: i128,
    pub d_token_rate: i128,
    pub rate_modifier: i128,
}

/// Helper struct for publishing events
pub struct Events;

impl Events {
    pub fn deposit(
        env: &soroban_sdk::Env,
        lender: &Address,
        asset: &Symbol,
        amount: i128,
        b_tokens: i128,
    ) {
        DepositEvent {
            lender: lender.clone(),
            asset: asset.clone(),
            amount,
            b_tokens,
        }
        .publish(env);
    }

    pub fn withdraw(
        env: &soroban_sdk::Env,
        lender: &Address,
        asset: &Symbol,
        amount: i128,
        b_tokens: i128,
    ) {
        WithdrawEvent {
            lender: lender.clone(),
            asset: asset.clone(),
            amount,
            b_tokens,
        }
        .publish(env);
    }

    pub fn borrow(
        env: &soroban_sdk::Env,
        borrower: &Address,
        asset: &Symbol,
        amount: i128,
        d_tokens: i128,
    ) {
        BorrowEvent {
            borrower: borrower.clone(),
            asset: asset.clone(),
            amount,
            d_tokens,
        }
        .publish(env);
    }

    pub fn repay(
        env: &soroban_sdk::Env,
        borrower: &Address,
        asset: &Symbol,
        amount: i128,
        d_tokens: i128,
    ) {
        RepayEvent {
            borrower: borrower.clone(),
            asset: asset.clone(),
            amount,
            d_tokens,
        }
        .publish(env);
    }

    pub fn add_collateral(
        env: &soroban_sdk::Env,
        borrower: &Address,
        rwa_token: &Address,
        amount: i128,
    ) {
        AddCollateralEvent {
            borrower: borrower.clone(),
            rwa_token: rwa_token.clone(),
            amount,
        }
        .publish(env);
    }

    pub fn remove_collateral(
        env: &soroban_sdk::Env,
        borrower: &Address,
        rwa_token: &Address,
        amount: i128,
    ) {
        RemoveCollateralEvent {
            borrower: borrower.clone(),
            rwa_token: rwa_token.clone(),
            amount,
        }
        .publish(env);
    }

    pub fn liquidation_initiated(
        env: &soroban_sdk::Env,
        borrower: &Address,
        rwa_token: &Address,
        debt_asset: &Symbol,
        collateral_amount: i128,
        debt_amount: i128,
        auction_id: &Address,
    ) {
        LiquidationInitiatedEvent {
            borrower: borrower.clone(),
            rwa_token: rwa_token.clone(),
            debt_asset: debt_asset.clone(),
            collateral_amount,
            debt_amount,
            auction_id: auction_id.clone(),
        }
        .publish(env);
    }

    pub fn liquidation_filled(
        env: &soroban_sdk::Env,
        auction_id: &Address,
        liquidator: &Address,
        collateral_received: i128,
        debt_paid: i128,
    ) {
        LiquidationFilledEvent {
            auction_id: auction_id.clone(),
            liquidator: liquidator.clone(),
            collateral_received,
            debt_paid,
        }
        .publish(env);
    }

    pub fn interest_accrued(
        env: &soroban_sdk::Env,
        asset: &Symbol,
        b_token_rate: i128,
        d_token_rate: i128,
        rate_modifier: i128,
    ) {
        InterestAccruedEvent {
            asset: asset.clone(),
            b_token_rate,
            d_token_rate,
            rate_modifier,
        }
        .publish(env);
    }
}

