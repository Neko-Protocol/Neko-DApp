use soroban_sdk::{panic_with_error, Address, Env, IntoVal, symbol_short, vec};

use crate::common::error::Error;
use crate::common::types::{COMPLIANCE_KEY, IDENTITY_KEY};
use crate::compliance::freeze::AuthorizationStorage;

/// SEP-57 compliance configuration and transfer checks
pub struct Compliance;

impl Compliance {
    // ==================== Storage ====================

    /// Get the compliance contract address (if configured)
    pub fn get_compliance(env: &Env) -> Option<Address> {
        env.storage().instance().get(&COMPLIANCE_KEY)
    }

    /// Set the compliance contract address
    pub fn set_compliance(env: &Env, compliance: &Address) {
        env.storage().instance().set(&COMPLIANCE_KEY, compliance);
    }

    /// Get the identity verifier contract address (if configured)
    pub fn get_identity_verifier(env: &Env) -> Option<Address> {
        env.storage().instance().get(&IDENTITY_KEY)
    }

    /// Set the identity verifier contract address
    pub fn set_identity_verifier(env: &Env, identity_verifier: &Address) {
        env.storage().instance().set(&IDENTITY_KEY, identity_verifier);
    }

    // ==================== Transfer Check ====================

    /// Check all compliance requirements before a transfer.
    /// Verifies freeze status and delegates to SEP-57 compliance contract if configured.
    pub fn check_transfer(env: &Env, from: &Address, to: &Address, amount: i128) {
        // Freeze enforcement: both sender and receiver must be authorized
        AuthorizationStorage::require_authorized(env, from);
        AuthorizationStorage::require_authorized(env, to);

        // Delegate to SEP-57 compliance contract if configured
        if let Some(compliance_addr) = Self::get_compliance(env) {
            let can_transfer: bool = env.invoke_contract(
                &compliance_addr,
                &symbol_short!("can_xfer"),
                vec![
                    env,
                    from.clone().into_val(env),
                    to.clone().into_val(env),
                    amount.into_val(env),
                ],
            );
            if !can_transfer {
                panic_with_error!(env, Error::ComplianceCheckFailed);
            }
        }
    }
}
