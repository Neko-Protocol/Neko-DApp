// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LendingPool} from "../src/core/LendingPool.sol";
import {PythPriceOracle} from "../src/oracles/PythPriceOracle.sol";
import {Backstop} from "../src/core/Backstop.sol";

/**
 * @title DeployPyth
 * @notice Deployment script for RWA Lending Protocol using Pyth Network
 * 
 * Usage:
 * ```bash
 * # Deploy to Sepolia testnet
 * forge script script/DeployPyth.s.sol:DeployPyth --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 * 
 * # Deploy to mainnet
 * forge script script/DeployPyth.s.sol:DeployPyth --rpc-url $ETH_RPC_URL --broadcast --verify
 * ```
 * 
 * Pyth Contract Addresses:
 * - Ethereum Mainnet: 0x4305FB66699C3B2702D0d05B8C1911DeF6e5C5E1
 * - Sepolia Testnet: 0x2880aB155794e7179c9eE2e38200202908C17B43
 * 
 * Price Feed IDs: https://pyth.network/developers/price-feed-ids
 */
contract DeployPyth is Script {
    // ============ Mainnet Addresses ============
    
    // Ondo RWA Tokens (Ethereum Mainnet)
    address constant NVDA_ON = 0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE;
    address constant TSLA_ON = 0xf6b1117ec07684D3958caD8BEb1b302bfD21103f;
    address constant AAPL_ON = 0x14c3abF95Cb9C93a8b82C1CdCB76D72Cb87b2d4c;
    address constant MSFT_ON = 0xB812837b81a3a6b81d7CD74CfB19A7f2784555E5;
    address constant AMZN_ON = 0xbb8774FB97436d23d74C1b882E8E9A69322cFD31;
    address constant META_ON = 0x59644165402b611b350645555B50Afb581C71EB2;
    
    // Stablecoins (Ethereum Mainnet)
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    
    // Pyth Network Contract Addresses
    // Mainnet: https://docs.pyth.network/price-feeds/contract-addresses/evm
    address constant PYTH_MAINNET = 0x4305FB66699C3B2702D4d05CF36551390A4c69C6;
    address constant PYTH_SEPOLIA = 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21;
    
    // Pyth Price Feed IDs (bytes32)
    // All price feed IDs configured in run() function
    // Find IDs at: https://pyth.network/developers/price-feed-ids
    // AAPL/USD: 0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688
    // NVDA/USD: 0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593
    // MSTR/USD: 0xe1e80251e5f5184f2195008382538e847fafc36f751896889dd3d1b1f6111f09
    // SPY/USD: 0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5
    // USDC/USD: 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a5
    // USDT/USD: 0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying RWA Lending Protocol with Pyth Network...");
        console.log("Deployer:", deployer);

        // Determine network and Pyth address
        address pythAddress = PYTH_MAINNET; // Change to PYTH_SEPOLIA for testnet
        // You can also read from env: vm.envAddress("PYTH_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Pyth Price Oracle
        PythPriceOracle oracle = new PythPriceOracle(pythAddress);
        console.log("PythPriceOracle deployed at:", address(oracle));

        // 2. Configure price feeds for RWA tokens and stablecoins
        // Configure RWA token price feeds
        address[] memory rwaTokens = new address[](2);
        bytes32[] memory rwaPriceIds = new bytes32[](2);
        
        rwaTokens[0] = AAPL_ON;
        rwaPriceIds[0] = vm.parseBytes32("0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688");
        
        rwaTokens[1] = NVDA_ON;
        rwaPriceIds[1] = vm.parseBytes32("0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593");
        
        oracle.setAssetPriceIds(rwaTokens, rwaPriceIds);
        console.log("Configured AAPL_ON and NVDA_ON price feeds");
        
        // Configure stablecoin price feeds
        address[] memory stablecoins = new address[](2);
        bytes32[] memory stablecoinPriceIds = new bytes32[](2);
        
        stablecoins[0] = USDC;
        stablecoinPriceIds[0] = vm.parseBytes32("0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a5");
        
        stablecoins[1] = USDT;
        stablecoinPriceIds[1] = vm.parseBytes32("0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b");
        
        oracle.setAssetPriceIds(stablecoins, stablecoinPriceIds);
        console.log("Configured USDC and USDT price feeds");

        // 3. Deploy Backstop for emergency liquidations
        Backstop backstop = new Backstop();
        console.log("Backstop deployed at:", address(backstop));

        // 4. Deploy Lending Pool
        LendingPool pool = new LendingPool(address(oracle));
        console.log("LendingPool deployed at:", address(pool));

        // 5. Add collateral assets (Ondo RWA tokens)
        // AAPL_ON
        pool.addCollateralAsset(
            AAPL_ON,
            5500,  // 55% LTV
            7000,  // 70% liquidation threshold
            1000   // 10% liquidation bonus
        );
        console.log("Added AAPL_ON as collateral");
        
        // NVDA_ON
        pool.addCollateralAsset(
            NVDA_ON,
            5000,  // 50% LTV (more volatile)
            6500,  // 65% liquidation threshold
            1000   // 10% liquidation bonus
        );
        console.log("Added NVDA_ON as collateral");
        
        // TSLA_ON (if you have a feed for it, otherwise use CustomPriceOracle)
        pool.addCollateralAsset(
            TSLA_ON,
            5000,  // 50% LTV
            6500,  // 65% liquidation threshold
            1000   // 10% liquidation bonus
        );
        console.log("Added TSLA_ON as collateral");

        // 6. Add borrowable assets (stablecoins)
        pool.addBorrowAsset(
            USDC,
            200,   // 2% base rate
            400,   // 4% slope1
            7500,  // 75% slope2
            8000   // 80% optimal utilization
        );
        console.log("Added USDC as borrowable");

        pool.addBorrowAsset(
            USDT,
            200,   // 2% base rate
            400,   // 4% slope1
            7500,  // 75% slope2
            8000   // 80% optimal utilization
        );
        console.log("Added USDT as borrowable");

        // 7. Configure Backstop
        pool.setBackstop(address(backstop));
        console.log("Backstop configured in LendingPool");

        backstop.setTokenSupport(USDC, true);
        backstop.setTokenSupport(USDT, true);
        console.log("Token support configured in Backstop");

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("PythPriceOracle:", address(oracle));
        console.log("Backstop:", address(backstop));
        console.log("LendingPool:", address(pool));
        console.log("\nNext steps:");
        console.log("1. Additional RWA tokens (TSLA_ON, etc.) may need CustomPriceOracle with keepers if no Pyth feed");
        console.log("2. Prices are updated automatically by Pyth Network");
    }
}
