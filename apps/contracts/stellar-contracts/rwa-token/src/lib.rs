#![no_std]

mod admin;
mod error;
mod events;
mod interfaces;
mod oracle;
mod storage;
mod types;

pub use error::Error;

// Import RWA Oracle WASM for reading RWA asset prices
pub mod rwa_oracle {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/rwa_oracle.wasm");
}

pub mod token;

mod test;