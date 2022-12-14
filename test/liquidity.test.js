const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers } = require("hardhat")
const { JSBI } = require("jsbi")
const BigNumberr = require('bignumber.js');
BigNumberr.config({ DECIMAL_PLACES: 18 })


function log(dat){
    console.log(dat);
}

const { Pool, Position, NonfungiblePositionManager, nearestUsableTick } = require('@uniswap/v3-sdk')
const { Token,Percent } = require('@uniswap/sdk-core')
const { abi: IUniswapV3PoolABI } = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
const { abi: INonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json')
const univ3prices = require('@thanpolas/univ3prices');


const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const WETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

const DAI_WHALE = "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2"
const USDC_WHALE = "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2"

const DAI_USDC_POOL = "0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168";
const positionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

const DAI_WETH_POOL = "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8";



require('dotenv').config({ path: ".env.local" })

const ALCHEMY_URL_MAINNET = process.env.ALCHEMY_URL_MAINNET


function tick_to_price(tick){
  return Math.pow(1.0001, tick);
}

async function printCurrentPrice(liquidityContract, token0, token1, poolFee, Token0Decimals, Token1Decimals) {
  let [ FinalTick, FinalSqrtPrice ] = await liquidityContract.getTickAndSqrtPrice(token0, token1, poolFee);
  log(`For current Price Individual prices...`)
  getIndividualPrice(FinalSqrtPrice, Token0Decimals, Token1Decimals)
  let sqrt_price = ((BigNumber.from(FinalSqrtPrice)).toString())
  const priceFinal = univ3prices([18, 18], sqrt_price).toSignificant({ decimalPlaces: 3 });
  console.log(`price : ${priceFinal}`);
  return priceFinal;
}

function getIndividualPrice(SqrtX96, Token0Decimals, Token1Decimals){ 
  SqrtX96 = SqrtX96.toString();
  const multok0 = new BigNumberr(10**Token0Decimals)
  const multok1 = new BigNumberr(10**Token1Decimals)
  const to18 = new BigNumberr(10**18)
  const X96 = new BigNumberr(2).pow(new BigNumberr(96))
  const X192 = X96.pow(new BigNumberr(2))

  let sqrtPriceA = new BigNumberr(SqrtX96);
  let sqrtPrice = sqrtPriceA.multipliedBy(sqrtPriceA)

  ///////////////////
  let Numerator2 = multok0.multipliedBy(sqrtPrice)
  let Denominator2 = multok1.multipliedBy(X192)

  let price = Denominator2.div(Numerator2)
  log(`token1 price in relation to token0 (ie buy 1 token of token1 with token0 (not including LQ available)): ${price.toString()}`) //token1 price in relation to token0 (ie buy 1 token of token1 with token0 (not including LQ available))

  let price2 = Numerator2.div(Denominator2)
  log(`token0 price in relation to token1 (ie buy 1 token of token0 with token1 (not including LQ available)): ${price2.toString()}`) //token0 price in relation to token1 (ie buy 1 token of token0 with token1 (not including LQ available))
  log("")
  return [price.toString(), price2.toString()];
}

describe("LiquidityUniswapV3", () => {
  let liquidityContract
  let accounts
  let dai
  let usdc
  let daiAmount = 1000000n * 10n ** 18n
  let usdcAmount = 1000000n * 10n ** 6n
  let wethAmount = 1000n * 10n ** 18n
  let poolContract
  let nonfungiblePositionManagerContract

  before(async () => {
    accounts = await ethers.getSigners()
    const provider = new ethers.providers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/UOdRxTyyeJu4-FcOki2B-pfG0RnekNMV")

    // Deploy liquidity helper contract
    const liquidityFactory = await ethers.getContractFactory("LiquidityUniswapV3")
    liquidityContract = await liquidityFactory.deploy()
    await liquidityContract.deployed()

    // Get pool for DAI-WETH
    poolContract = new ethers.Contract(
      DAI_WETH_POOL,
      IUniswapV3PoolABI,
      provider
    )
    // Non Fungible Position Manager
    nonfungiblePositionManagerContract = new ethers.Contract(
      positionManagerAddress,
      INonfungiblePositionManagerABI,
      provider
    )

    dai = await ethers.getContractAt("IERC20", DAI)
    usdc = await ethers.getContractAt("IERC20", USDC)
    weth = await ethers.getContractAt("IWETH", WETH9)

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
    let token0 = DAI
    let token1 = WETH9
    let poolFee = 3000 //0.3% fees pool
    let token0amount = 100n * 10n ** 18n
    let token1amount = 1n * 10n ** 18n
    let Token0Decimals = 18;
    let Token1Decimals = 18;
    let factorForTickWidth = 2;


    let InitPrice = await printCurrentPrice(liquidityContract, token0, token1, poolFee,Token0Decimals, Token1Decimals);

    console.log(`ETH balance: ${await ethers.provider.getBalance(accounts[0].address)}`)
    
    console.log( ` transffering DAI ....`)
    await dai.connect(accounts[0]).transfer(liquidityContract.address, token0amount);

    console.log( ` transffering USDC ....`)
    await usdc.connect(accounts[0]).transfer(liquidityContract.address, usdcAmount);

    console.log( ` transffering WETH ....`)
    await weth.deposit({ value: token1amount })
    wethAmount = await weth.balanceOf(accounts[0].address);
    console.log(`WETH amount before swap: ${ethers.utils.formatEther(wethAmount)}`);
    await weth.connect(accounts[0]).transfer(liquidityContract.address, wethAmount);

    console.log( `calling mint....`)
    let txn = await liquidityContract.connect(accounts[0]).mintNewPosition(token0, token1, token0amount, token1amount, poolFee);
    let rc = await txn.wait();
    let adding_liquidity_event = rc.events.find(
      (event) => event.event === "LiquidityAdded"
    )

    let [tokenId, , , ] = adding_liquidity_event.args;
    console.log(`Token ID: ${tokenId}`);
    // Extracting 
    let [ticktLower, tickUpper, liquidity, sqrtLower, sqrtUpper] = await liquidityContract.getPosition(tokenId);
    console.log(`ticktLower: ${ticktLower} tickUpper: ${tickUpper} liquidity: ${liquidity}`)
    let factor = 1;
    if(tickUpper < 0) factor = -1;
    let priceLower = tick_to_price(factor * ticktLower);
    let priceUpper = tick_to_price(factor * tickUpper);

    console.log(`priceLower: ${priceLower} priceUpper: ${priceUpper}`);

    let FinalPrice = await printCurrentPrice(liquidityContract, token0, token1, poolFee,Token0Decimals, Token1Decimals);

    //Get Token0 and Token1 price at lower and upperfrom sqrt price 
    log("Individual price for Lower Tick")
    let [priceLower0, priceLower1] = getIndividualPrice(sqrtLower, Token0Decimals, Token1Decimals)
    log("Individual price for Upper Tick")
    let [priceUpper0, priceUpper1] = getIndividualPrice(sqrtUpper, Token0Decimals, Token1Decimals)


    //Impermanent Loass calculation of V3 based on https://lambert-guillaume.medium.com/an-analysis-of-the-expected-value-of-the-impermanent-loss-in-uniswap-bfbfebbefed2
    let alpha = FinalPrice/InitPrice;
    let r = Math.pow((tickUpper/ticktLower), 0.5);
    if (ticktLower < 0 ){
      r = 1/r;
    }
    console.log(`alpha: ${alpha} R: ${r}`)
    let sqrtR = (Math.pow(r,0.5))
    let il;

    if (alpha < (1/r)){
      console.log(`IL 1`)
      il = (( sqrtR * alpha) - 1) / (alpha + 1)
    }
    else if(alpha < r){
      console.log(`IL 2`)
      il = ((sqrtR) / (sqrtR - 1)) * ( ((2 * Math.pow(alpha,0.5)) / (alpha + 1)) - 1)
    }
    else{
      console.log(`IL 3`)
      il = (sqrtR - alpha) / (alpha + 1)
    }
    console.log(`Impermanent Loss: ${il}`)

    


    console.log(
      "DAI balance after add liquidity",
      ethers.utils.formatEther(await dai.balanceOf(accounts[0].address))
    )
    console.log(
      "USDC balance after add liquidity",
      ethers.utils.formatUnits(await usdc.balanceOf(accounts[0].address), 6)
    )
    console.log(
      "WETH9 balance after add liquidity",
      ethers.utils.formatEther(await weth.balanceOf(accounts[0].address))
    )

    // if(il> threshholdValue){
    //   log("Decrease liquidity And Collect Fees...");
    //   txn = await liquidityContract.connect(accounts[0]).decreaseLiquidityAndCollectFees(tokenId);
    //   rc = await txn.wait();
    //   log("Removed")
    // }

    log("Decrease liquidity And Collect Fees...");
    txn = await liquidityContract.connect(accounts[0]).decreaseLiquidityAndCollectFees(tokenId);
    rc = await txn.wait();
    log("Removed")

  })

})






// async funciton getImpermanentLoss(tokenId, poolContract) {

// }

//Doubts
//1. different ticks in sdk and contract
//2. ticks dont change after adding liquidity
//3. check if liquidity changes
//4. what all factors change after adding liquidity