use soroban_sdk::{contractevent, Address, Env};

/// Mint event emitted when tokens are minted
#[contractevent]
pub struct MintEvent {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

/// Burn event emitted when tokens are burned
#[contractevent]
pub struct BurnEvent {
    #[topic]
    pub from: Address,
    pub amount: i128,
}

/// Transfer event emitted when tokens are transferred
#[contractevent]
pub struct TransferEvent {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

/// Approve event emitted when a user approves a spender
#[contractevent]
pub struct ApproveEvent {
    #[topic]
    pub from: Address,
    #[topic]
    pub spender: Address,
    pub amount: i128,
    pub live_until_ledger: u32,
}

/// Clawback event emitted when tokens are clawed back by admin
#[contractevent]
pub struct ClawbackEvent {
    #[topic]
    pub from: Address,
    pub amount: i128,
}

/// Event emission utilities
pub struct Events;

impl Events {
    pub fn mint(env: &Env, to: &Address, amount: i128) {
        MintEvent {
            to: to.clone(),
            amount,
        }
        .publish(env);
    }

    pub fn burn(env: &Env, from: &Address, amount: i128) {
        BurnEvent {
            from: from.clone(),
            amount,
        }
        .publish(env);
    }

    pub fn transfer(env: &Env, from: &Address, to: &Address, amount: i128) {
        TransferEvent {
            from: from.clone(),
            to: to.clone(),
            amount,
        }
        .publish(env);
    }

    pub fn approve(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
        live_until_ledger: u32,
    ) {
        ApproveEvent {
            from: from.clone(),
            spender: spender.clone(),
            amount,
            live_until_ledger,
        }
        .publish(env);
    }

    pub fn clawback(env: &Env, from: &Address, amount: i128) {
        ClawbackEvent {
            from: from.clone(),
            amount,
        }
        .publish(env);
    }
}

