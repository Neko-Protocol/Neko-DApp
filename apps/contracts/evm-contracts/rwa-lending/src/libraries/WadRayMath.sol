// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WadRayMath
 * @notice Math library for handling fixed-point arithmetic with WAD (18 decimals) and RAY (27 decimals)
 * @dev Based on Aave's WadRayMath library
 */
library WadRayMath {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant HALF_WAD = 0.5e18;

    uint256 internal constant RAY = 1e27;
    uint256 internal constant HALF_RAY = 0.5e27;

    uint256 internal constant WAD_RAY_RATIO = 1e9;

    /**
     * @notice Multiplies two WAD numbers and returns a WAD
     * @param a First WAD number
     * @param b Second WAD number
     * @return Result in WAD
     */
    function wadMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0 || b == 0) {
            return 0;
        }
        return (a * b + HALF_WAD) / WAD;
    }

    /**
     * @notice Divides two WAD numbers and returns a WAD
     * @param a Numerator in WAD
     * @param b Denominator in WAD
     * @return Result in WAD
     */
    function wadDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0, "Division by zero");
        uint256 halfB = b / 2;
        return (a * WAD + halfB) / b;
    }

    /**
     * @notice Multiplies two RAY numbers and returns a RAY
     * @param a First RAY number
     * @param b Second RAY number
     * @return Result in RAY
     */
    function rayMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0 || b == 0) {
            return 0;
        }
        return (a * b + HALF_RAY) / RAY;
    }

    /**
     * @notice Divides two RAY numbers and returns a RAY
     * @param a Numerator in RAY
     * @param b Denominator in RAY
     * @return Result in RAY
     */
    function rayDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0, "Division by zero");
        uint256 halfB = b / 2;
        return (a * RAY + halfB) / b;
    }

    /**
     * @notice Converts RAY to WAD (loses precision)
     * @param a Value in RAY
     * @return Value in WAD
     */
    function rayToWad(uint256 a) internal pure returns (uint256) {
        uint256 halfRatio = WAD_RAY_RATIO / 2;
        return (a + halfRatio) / WAD_RAY_RATIO;
    }

    /**
     * @notice Converts WAD to RAY
     * @param a Value in WAD
     * @return Value in RAY
     */
    function wadToRay(uint256 a) internal pure returns (uint256) {
        return a * WAD_RAY_RATIO;
    }

    /**
     * @notice Calculates the percentage of a value
     * @param value The value
     * @param percentage Percentage in basis points (10000 = 100%)
     * @return Result
     */
    function percentMul(uint256 value, uint256 percentage) internal pure returns (uint256) {
        if (value == 0 || percentage == 0) {
            return 0;
        }
        return (value * percentage + 5000) / 10000;
    }

    /**
     * @notice Calculates the percentage division of a value
     * @param value The value
     * @param percentage Percentage in basis points (10000 = 100%)
     * @return Result
     */
    function percentDiv(uint256 value, uint256 percentage) internal pure returns (uint256) {
        require(percentage != 0, "Division by zero");
        uint256 halfPercentage = percentage / 2;
        return (value * 10000 + halfPercentage) / percentage;
    }
}

