use soroban_sdk::{Address, Symbol, contractevent};

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
    pub auction_id: u32,
}

#[contractevent]
pub struct LiquidationFilledEvent {
    pub auction_id: u32,
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

#[contractevent]
pub struct BadDebtAuctionCreatedEvent {
    pub auction_id: u32,
    pub borrower: Address,
    pub debt_asset: Symbol,
    pub debt_amount: i128,
}

#[contractevent]
pub struct BadDebtAuctionFilledEvent {
    pub auction_id: u32,
    pub bidder: Address,
    pub debt_covered: i128,
    pub backstop_tokens: i128,
}

#[contractevent]
pub struct InterestAuctionCreatedEvent {
    pub auction_id: u32,
    pub asset: Symbol,
    pub interest_amount: i128,
}

#[contractevent]
pub struct InterestAuctionFilledEvent {
    pub auction_id: u32,
    pub bidder: Address,
    pub asset: Symbol,
    pub interest_received: i128,
    pub backstop_paid: i128,
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
        auction_id: u32,
    ) {
        LiquidationInitiatedEvent {
            borrower: borrower.clone(),
            rwa_token: rwa_token.clone(),
            debt_asset: debt_asset.clone(),
            collateral_amount,
            debt_amount,
            auction_id,
        }
        .publish(env);
    }

    pub fn liquidation_filled(
        env: &soroban_sdk::Env,
        auction_id: u32,
        liquidator: &Address,
        collateral_received: i128,
        debt_paid: i128,
    ) {
        LiquidationFilledEvent {
            auction_id,
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

    pub fn bad_debt_auction_created(
        env: &soroban_sdk::Env,
        auction_id: u32,
        borrower: &Address,
        debt_asset: &Symbol,
        debt_amount: i128,
    ) {
        BadDebtAuctionCreatedEvent {
            auction_id,
            borrower: borrower.clone(),
            debt_asset: debt_asset.clone(),
            debt_amount,
        }
        .publish(env);
    }

    pub fn bad_debt_auction_filled(
        env: &soroban_sdk::Env,
        auction_id: u32,
        bidder: &Address,
        debt_covered: i128,
        backstop_tokens: i128,
    ) {
        BadDebtAuctionFilledEvent {
            auction_id,
            bidder: bidder.clone(),
            debt_covered,
            backstop_tokens,
        }
        .publish(env);
    }

    pub fn interest_auction_created(
        env: &soroban_sdk::Env,
        auction_id: u32,
        asset: &Symbol,
        interest_amount: i128,
    ) {
        InterestAuctionCreatedEvent {
            auction_id,
            asset: asset.clone(),
            interest_amount,
        }
        .publish(env);
    }

    pub fn interest_auction_filled(
        env: &soroban_sdk::Env,
        auction_id: u32,
        bidder: &Address,
        asset: &Symbol,
        interest_received: i128,
        backstop_paid: i128,
    ) {
        InterestAuctionFilledEvent {
            auction_id,
            bidder: bidder.clone(),
            asset: asset.clone(),
            interest_received,
            backstop_paid,
        }
        .publish(env);
    }
}
