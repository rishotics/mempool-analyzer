const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers } = require("hardhat")
const { JSBI } = require("jsbi")

const { Pool, Position, NonfungiblePositionManager, nearestUsableTick } = require('@uniswap/v3-sdk')
const { Token,Percent } = require('@uniswap/sdk-core')
const { abi: IUniswapV3PoolABI } = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
const { abi: INonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json')
const univ3prices = require('@thanpolas/univ3prices');


const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

const DAI_WHALE = "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2"
const USDC_WHALE = "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2"

const DAI_USDC_POOL = "0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168";
const positionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";



require('dotenv').config({ path: ".env.local" })

const ALCHEMY_URL_MAINNET = process.env.ALCHEMY_URL_MAINNET


function tick_to_price(tick){
  return 
}


async function getPoolData(poolContract) {
  const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
    poolContract.tickSpacing(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ])

  return {
    tickSpacing: tickSpacing,
    fee: fee,
    liquidity: liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  }
}

async function getPoolImmutables(poolContract) {
  const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
    poolContract.factory(),
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.tickSpacing(),
    poolContract.maxLiquidityPerTick(),
  ])

  return {
    factory: factory,
    token0: token0,
    token1: token1,
    fee: fee,
    tickSpacing: tickSpacing,
    maxLiquidityPerTick: maxLiquidityPerTick,
  }
}

async function getPoolState(poolContract) {
  const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()])

  return {
    liquidity: liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1]
  }

  return PoolState
}

describe("LiquidityUniswapV3", () => {
  let liquidityContract
  let accounts
  let dai
  let usdc
  let daiAmount = 1000000n * 10n ** 18n
  let usdcAmount = 1000000n * 10n ** 6n
  let poolContract
  let nonfungiblePositionManagerContract

  before(async () => {
    accounts = await ethers.getSigners()
    const provider = new ethers.providers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/UOdRxTyyeJu4-FcOki2B-pfG0RnekNMV")

    const liquidityFactory = await ethers.getContractFactory("LiquidityUniswapV3")
    liquidityContract = await liquidityFactory.deploy()
    await liquidityContract.deployed()

    poolContract = new ethers.Contract(
      DAI_USDC_POOL,
      IUniswapV3PoolABI,
      provider
    )

    nonfungiblePositionManagerContract = new ethers.Contract(
      positionManagerAddress,
      INonfungiblePositionManagerABI,
      provider
    )


    dai = await ethers.getContractAt("IERC20", DAI)
    usdc = await ethers.getContractAt("IERC20", USDC)

    // Unlock DAI and USDC whales
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [DAI_WHALE],
    })
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_WHALE],
    })

    const daiWhale = await ethers.getSigner(DAI_WHALE)
    const usdcWhale = await ethers.getSigner(USDC_WHALE)

    // Send DAI and USDC to accounts[0]

    expect(await dai.balanceOf(daiWhale.address)).to.gte(daiAmount)
    expect(await usdc.balanceOf(usdcWhale.address)).to.gte(usdcAmount)

    await dai.connect(daiWhale).transfer(accounts[0].address, daiAmount)
    await usdc.connect(usdcWhale).transfer(accounts[0].address, usdcAmount)

  })

  it("mintNewPosition", async () => {
    const [immutables, state] = await Promise.all([getPoolImmutables(poolContract), getPoolState(poolContract)])

    const DAI_token = new Token(1, immutables.token0, 18, 'DAI', 'DAI ')

    const USDC_token = new Token(1, immutables.token1, 6, 'USDC', 'USDC')

    const daiUsdcPool = new Pool(
      DAI_token,
      USDC_token,
      immutables.fee,
      state.sqrtPriceX96.toString(),
      state.liquidity.toString(),
      state.tick
    )
    // console.log(daiUsdcPool)

    const position = new Position({
      pool: daiUsdcPool,
      liquidity: ethers.utils.parseUnits('0.1', 18),
      tickLower: nearestUsableTick(state.tick, immutables.tickSpacing) - immutables.tickSpacing * 2,
      tickUpper: nearestUsableTick(state.tick, immutables.tickSpacing) + immutables.tickSpacing * 2,
    })

    const { amount0: amount0Desired, amount1: amount1Desired } = position.mintAmounts

    params = {
      token0: DAI,
      token1: USDC,
      fee: immutables.fee,
      tickLower: nearestUsableTick(state.tick, immutables.tickSpacing) - immutables.tickSpacing * 2,
      tickUpper: nearestUsableTick(state.tick, immutables.tickSpacing) + immutables.tickSpacing * 2,
      amount0Desired: amount0Desired.toString(),
      amount1Desired: amount1Desired.toString(),
      amount0Min: amount0Desired.toString(),
      amount1Min: amount1Desired.toString(),
      recipient: accounts[0].address,
      deadline: Math.floor(Date.now() / 1000) + (60 * 10)
    }

    let slot0 = await poolContract.slot0();
    let sqrt_price = ((BigNumber.from(slot0.sqrtPriceX96)).toString())

    const priceInit = univ3prices([18, 6], sqrt_price).toSignificant({ decimalPlaces: 3 });
    console.log(`price: ${priceInit}`)

    const SwapFactory = await ethers.getContractFactory("SwapUniswapV3")
    swapContract = await SwapFactory.deploy()
    await swapContract.deployed()

    const amountIn = 100000n ** 18n
    const dai_in = ethers.utils.parseEther("100000")
    await dai.connect(accounts[0]).approve(swapContract.address, dai_in)
    // Swap
    console.log("USDC balance before swap", await usdc.balanceOf(accounts[0].address))
    await swapContract.swapExactInputSingle(dai_in)
    console.log("USDC balance after swap", await usdc.balanceOf(accounts[0].address))

    let slot0_final = await poolContract.slot0();
    let sqrt_price_final = ((BigNumber.from(slot0_final.sqrtPriceX96)).toString())

    const priceFinal = univ3prices([18, 6], sqrt_price_final).toSignificant({ decimalPlaces: 3 });
    console.log(`price Final: ${priceFinal}`)




    // await nonfungiblePositionManagerContract.connect(accounts[0]).mint(
    //   params,
    //   { gasLimit: ethers.utils.hexlify(1000000) }
    // )
    // let rc = await txn.wait();
    // console.log(rc)

    // await dai.connect(accounts[0]).transfer(liquidityContract.address, daiAmount);
    // await usdc.connect(accounts[0]).transfer(liquidityContract.address, usdcAmount);

    // await liquidityContract.mintNewPosition();

    console.log(
      "DAI balance after add liquidity",
      ethers.utils.formatEther(await dai.balanceOf(accounts[0].address))
    )
    console.log(
      "USDC balance after add liquidity",
      ethers.utils.formatUnits(await usdc.balanceOf(accounts[0].address), 6)
    )



  })

})