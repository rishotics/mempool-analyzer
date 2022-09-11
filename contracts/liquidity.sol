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
    uint24 public poolFee;

    INonfungiblePositionManager public nonfungiblePositionManager =
        INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    IUniswapV3 internal factoryinstance =
        IUniswapV3(0x1F98431c8aD98523631AE4a59f267346ea31F984);

    /// @notice Represents the deposit of an NFT
    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
        int24 tickLower;
        int24 tickUpper;
        uint256 tokensOwed0;
        uint256 tokensOwed1;
    }

    /// @dev deposits[tokenId] => Deposit
    mapping(uint256 => Deposit) public deposits;

    // Store token id used in this example
    uint256 public tokenId;

    event LiquidityAdded(
        uint256 tokenId,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    );

    // Implementing `onERC721Received` so this contract can receive custody of erc721 tokens
    function onERC721Received(
        address operator,
        address,
        uint256 _tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // _createDeposit(operator, _tokenId, tickLower, tickUpper, tokensOwed0, tokensOwed1);
        return this.onERC721Received.selector;
    }

    function _createDeposit(address owner, uint256 _tokenId, int24 tickLower, int24 tickUpper, uint256 tokensOwed0, uint256 tokensOwed1) internal {
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
            token1: token1,
            tickLower: tickLower,
            tickUpper: tickUpper,
            tokensOwed0: tokensOwed0,
            tokensOwed1: tokensOwed1
        });

        console.log("Token id", _tokenId);
        console.log("Liquidity", liquidity);

        tokenId = _tokenId;
    }

    /// @notice swapExactOutputSingle swaps a minimum possible amount of DAI for a fixed amount of WETH.
    /// @dev The calling address must approve this contract to spend its DAI for this function to succeed. As the amount of input DAI is variable,
    /// the calling address will need to approve for a slightly higher amount, anticipating some variance.
    /// @param _token0 address for token 0
    /// @param _token1 address for token 1
    /// @param amount0ToMint amount for token 0
    /// @param amount1ToMint amount for token 1
    /// @param _fee fee for the pool
    /// @return _tokenId of token minted
    /// @return liquidity  added
    /// @return amount0 amount of token0 added
    /// @return amount1 amount of token1 added
    function mintNewPosition(
        address _token0,
        address _token1,
        uint256 amount0ToMint,
        uint256 amount1ToMint,
        uint24 _fee
    )
        external
        returns (
            uint256 _tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        poolFee = _fee;
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
        address _poolAddress = factoryinstance.getPool(
            _token0,
            _token1,
            poolFee
        );
        console.log(_poolAddress);

        IUniswapV3Pool _pool;
        _pool = IUniswapV3Pool(_poolAddress);
        console.log("mint....:");
        (int24 tickBefore, ) = getTickAndSqrtPrice(_token0, _token1, poolFee);
        int24 tickSpacing = _pool.tickSpacing();
        // int24 tickLower =  _floor(tickBefore - (2 * tickSpacing), tickSpacing);
        // int24 tickUpper =  _floor(tickBefore + (2 * tickSpacing), tickSpacing);

        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: _token0,
                token1: _token1,
                fee: poolFee,
                tickLower: _floor(tickBefore - (2 * tickSpacing), tickSpacing),
                tickUpper: _floor(tickBefore + (2 * tickSpacing), tickSpacing),
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

        // Create a deposit
        _createDeposit(msg.sender, _tokenId, _floor(tickBefore - (2 * tickSpacing), tickSpacing), _floor(tickBefore + (2 * tickSpacing), tickSpacing), amount0, amount1);

        // Remove allowance and refund in both assets.
        if (amount0 < amount0ToMint) {
            TransferHelper.safeApprove(
                _token0,
                address(nonfungiblePositionManager),
                0
            );
            uint256 refund0 = amount0ToMint - amount0;
            TransferHelper.safeTransfer(_token0, msg.sender, refund0);
        }

        if (amount1 < amount1ToMint) {
            TransferHelper.safeApprove(
                _token1,
                address(nonfungiblePositionManager),
                0
            );
            uint256 refund1 = amount1ToMint - amount1;
            TransferHelper.safeTransfer(_token1, msg.sender, refund1);
        }
        emit LiquidityAdded(_tokenId, _token0, _token1, amount0, amount1);
    }

    function _floor(int24 tick, int24 _tickSpacing)
        internal
        pure
        returns (int24)
    {
        int24 compressed = tick / _tickSpacing;
        if (tick < 0 && tick % _tickSpacing != 0) compressed--;
        return compressed * _tickSpacing;
    }

    function getPosition(uint256 _tokenId)
        public
        view
        returns (
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint160 sqrtLower,
            uint160 sqrtUpper
        )
    {
        (
            ,
            ,
            ,
            ,
            ,
            tickLower,
            tickUpper,
            liquidity,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(_tokenId);

        sqrtLower = TickMath.getSqrtRatioAtTick(tickLower);
        sqrtUpper = TickMath.getSqrtRatioAtTick(tickUpper);
    }

    function getTickAndSqrtPrice(
        address _token0,
        address _token1,
        uint24 _fee
    ) public view returns (int24 tick, uint160 sqrtPrice) {
        address _poolAddress = factoryinstance.getPool(_token0, _token1, _fee);
        console.log("Pool Address: ");
        console.log(_poolAddress);

        IUniswapV3Pool _pool;
        _pool = IUniswapV3Pool(_poolAddress);
        (sqrtPrice, tick, , , , , ) = _pool.slot0();
    }


    function decreaseLiquidity(uint256 _tokenId)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        
        Deposit memory deposit = deposits[_tokenId];
        require(msg.sender == deposit.owner, "Wrong owner Call");
        INonfungiblePositionManager.DecreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .DecreaseLiquidityParams({
                    tokenId: _tokenId,
                    liquidity: deposit.liquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: uint256(-1)
                });

        (amount0, amount1) = nonfungiblePositionManager.decreaseLiquidity(
            params
        );

        console.log("amount 0", amount0);
        console.log("amount 1", amount1);
        console.log("collecting fees...");
        collectAllFees(_tokenId);

        nonfungiblePositionManager.burn(_tokenId);
    }


    function collectAllFees(uint256 _tokenId) internal returns (uint256 amount0, uint256 amount1) {
        
        INonfungiblePositionManager.CollectParams memory params =
            INonfungiblePositionManager.CollectParams({
                tokenId: _tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);

        console.log("fee 0", amount0);
        console.log("fee 1", amount1);
    }
}
