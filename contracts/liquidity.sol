// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/base/LiquidityManagement.sol";
import {IUniswapV3} from "./interfaces/IUniswapV3.sol";

import "hardhat/console.sol";

contract LiquidityUniswapV3 is IERC721Receiver {
        using SafeMath for uint256;

    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // 0.01% fee
    uint24 public constant poolFee = 100;

    INonfungiblePositionManager public nonfungiblePositionManager = 
        INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    IUniswapV3 internal factoryinstance = IUniswapV3(0x1F98431c8aD98523631AE4a59f267346ea31F984);

    /// @notice Represents the deposit of an NFT
    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }

    /// @dev deposits[tokenId] => Deposit
    mapping(uint => Deposit) public deposits;

    // Store token id used in this example
    uint public tokenId;

    // Implementing `onERC721Received` so this contract can receive custody of erc721 tokens
    function onERC721Received(
        address operator,
        address,
        uint _tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        _createDeposit(operator, _tokenId);
        return this.onERC721Received.selector;
    }

    function _createDeposit(address owner, uint _tokenId) internal {
        (
            ,
            ,
            address token0,
            address token1,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(_tokenId);
        // set the owner and data for position
        // operator is msg.sender
        deposits[_tokenId] = Deposit({
            owner: owner,
            liquidity: liquidity,
            token0: token0,
            token1: token1
        });

        console.log("Token id", _tokenId);
        console.log("Liquidity", liquidity);

        tokenId = _tokenId;
    }

    function mintNewPosition(address _token0, address _token1, uint amount0ToMint, uint amount1ToMint)
        external
        returns (
            uint _tokenId,
            uint128 liquidity,
            uint amount0,
            uint amount1
        )
    {
        // For this example, we will provide equal amounts of liquidity in both assets.
        // Providing liquidity in both assets means liquidity will be earning fees and is considered in-range.
        // uint amount0ToMint = 100 * 1e18;
        // uint amount1ToMint = 100 * 1e18;

        // Approve the position manager
        TransferHelper.safeApprove(
            _token0,
            address(nonfungiblePositionManager),
            amount0ToMint
        );
        TransferHelper.safeApprove(
            _token1,
            address(nonfungiblePositionManager),
            amount1ToMint
        );
        address _poolAddress = factoryinstance.getPool(_token0, _token1, poolFee);
        console.log(_poolAddress);

        IUniswapV3Pool _pool;
        _pool = IUniswapV3Pool(_poolAddress);
        console.log("mint....:");
        (int24 tickBefore) = getSqrtPriceAndTick(_pool);
        int24 tickSpacing = _pool.tickSpacing();


        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: _token0,
                token1: _token1,
                fee: poolFee,
                tickLower: tickBefore - (2 * tickSpacing),
                tickUpper: tickBefore + (2 * tickSpacing),
                amount0Desired: amount0ToMint,
                amount1Desired: amount1ToMint,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });

        // Note that the pool defined by DAI/USDC and fee tier 0.01% must 
        // already be created and initialized in order to mint
        (_tokenId, liquidity, amount0, amount1) = nonfungiblePositionManager
            .mint(params);

        console.log("mint done....:");
        getSqrtPriceAndTick(_pool);

        getImpermanentLoss(_tokenId);

        // Create a deposit
        _createDeposit(msg.sender, _tokenId);

        // Remove allowance and refund in both assets.
        if (amount0 < amount0ToMint) {
            TransferHelper.safeApprove(
                _token0,
                address(nonfungiblePositionManager),
                0
            );
            uint refund0 = amount0ToMint - amount0;
            TransferHelper.safeTransfer(_token0, msg.sender, refund0);
        }

        if (amount1 < amount1ToMint) {
            TransferHelper.safeApprove(
                _token1,
                address(nonfungiblePositionManager),
                0
            );
            uint refund1 = amount1ToMint - amount1;
            TransferHelper.safeTransfer(_token1, msg.sender, refund1);
        }
    }

    function getSqrtPriceAndTick(IUniswapV3Pool _pool) public view returns(int24 ){
        (uint160 sqrtPriceX96Final, int24 tick, , , , , ) = _pool.slot0();
        console.log("Tick : ");
        console.logInt(tick);
        uint256 priceAfter = ((sqrtPriceX96Final * 1 ether) ** 2) / (2** (96*2));
        console.log("Price ");
        console.log(priceAfter);
        return tick;
    }

    function getImpermanentLoss(uint _tokenId) public view{
        (
            ,
            ,
            address token0,
            address token1,
            ,
            int24 tickLower,
            int24 tickUpper,
            ,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(_tokenId);

        uint160 sqrtLowerPrice = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtUpperPrice = TickMath.getSqrtRatioAtTick(tickUpper);
        address _poolAddress = factoryinstance.getPool(token0, token1, poolFee);
        console.log(_poolAddress);

        IUniswapV3Pool _pool;
        _pool = IUniswapV3Pool(_poolAddress);
        (uint160 sqrtCurrPrice, , , , , , ) = _pool.slot0();

        uint160 il= (2 * sqrtCurrPrice - sqrtLowerPrice - (sqrtCurrPrice / sqrtUpperPrice)) / (1 - (sqrtLowerPrice) + ((1-(1/ sqrtUpperPrice)) * sqrtCurrPrice));
        console.log("impermanent loss");
        console.log(il);
    }

    function collectAllFees() external returns (uint256 amount0, uint256 amount1) {
        // set amount0Max and amount1Max to uint256.max to collect all fees
        // alternatively can set recipient to msg.sender and avoid another transaction in `sendToOwner`
        INonfungiblePositionManager.CollectParams memory params =
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);

        console.log("fee 0", amount0);
        console.log("fee 1", amount1);
    }

    function increaseLiquidityCurrentRange(
        uint256 amountAdd0,
        uint256 amountAdd1
    )
        external
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        TransferHelper.safeTransferFrom(DAI, msg.sender, address(this), amountAdd0);
        TransferHelper.safeTransferFrom(USDC, msg.sender, address(this), amountAdd1);

        TransferHelper.safeApprove(DAI, address(nonfungiblePositionManager), amountAdd0);
        TransferHelper.safeApprove(USDC, address(nonfungiblePositionManager), amountAdd1);

        INonfungiblePositionManager.IncreaseLiquidityParams memory params =
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: amountAdd0,
                amount1Desired: amountAdd1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });

        (liquidity, amount0, amount1) = nonfungiblePositionManager.increaseLiquidity(params);

        console.log("liquidity", liquidity);
        console.log("amount 0", amount0);
        console.log("amount 1", amount1);
    }

    function getLiquidity(uint _tokenId) external view returns (uint128) {
        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(_tokenId);
        return liquidity;
    }

    function decreaseLiquidity(uint128 liquidity) external returns (uint amount0, uint amount1) {
        INonfungiblePositionManager.DecreaseLiquidityParams memory params =
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });

        (amount0, amount1) = nonfungiblePositionManager.decreaseLiquidity(params);

        console.log("amount 0", amount0);
        console.log("amount 1", amount1);
    }
}