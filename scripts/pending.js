var ethers = require("ethers");
const abiDecoder = require('abi-decoder'); // NodeJS
const axios = require('axios').default;
// const {UNISWAP_V3_SWAP_CONTRACT_ABI} = require("abi.js");
const Web3 = require('web3');
var UNISWAP_V3_SWAP_CONTRACT_ABI = [
  { "inputs": [{ "internalType": "address", "name": "_factoryV2", "type": "address" }, { "internalType": "address", "name": "factoryV3", "type": "address" }, { "internalType": "address", "name": "_positionManager", "type": "address" }, { "internalType": "address", "name": "_WETH9", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [], "name": "WETH9", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "approveMax", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "approveMaxMinusOne", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "approveZeroThenMax", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "approveZeroThenMaxMinusOne", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "callPositionManager", "outputs": [{ "internalType": "bytes", "name": "result", "type": "bytes" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "bytes[]", "name": "paths", "type": "bytes[]" }, { "internalType": "uint128[]", "name": "amounts", "type": "uint128[]" }, { "internalType": "uint24", "name": "maximumTickDivergence", "type": "uint24" }, { "internalType": "uint32", "name": "secondsAgo", "type": "uint32" }], "name": "checkOracleSlippage", "outputs": [], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes", "name": "path", "type": "bytes" }, { "internalType": "uint24", "name": "maximumTickDivergence", "type": "uint24" }, { "internalType": "uint32", "name": "secondsAgo", "type": "uint32" }], "name": "checkOracleSlippage", "outputs": [], "stateMutability": "view", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "bytes", "name": "path", "type": "bytes" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" }], "internalType": "struct IV3SwapRouter.ExactInputParams", "name": "params", "type": "tuple" }], "name": "exactInput", "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "address", "name": "tokenIn", "type": "address" }, { "internalType": "address", "name": "tokenOut", "type": "address" }, { "internalType": "uint24", "name": "fee", "type": "uint24" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" }, { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }], "internalType": "struct IV3SwapRouter.ExactInputSingleParams", "name": "params", "type": "tuple" }], "name": "exactInputSingle", "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "bytes", "name": "path", "type": "bytes" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "uint256", "name": "amountInMaximum", "type": "uint256" }], "internalType": "struct IV3SwapRouter.ExactOutputParams", "name": "params", "type": "tuple" }], "name": "exactOutput", "outputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "address", "name": "tokenIn", "type": "address" }, { "internalType": "address", "name": "tokenOut", "type": "address" }, { "internalType": "uint24", "name": "fee", "type": "uint24" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "uint256", "name": "amountInMaximum", "type": "uint256" }, { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }], "internalType": "struct IV3SwapRouter.ExactOutputSingleParams", "name": "params", "type": "tuple" }], "name": "exactOutputSingle", "outputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "factory", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "factoryV2", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "getApprovalType", "outputs": [{ "internalType": "enum IApproveAndCall.ApprovalType", "name": "", "type": "uint8" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "address", "name": "token0", "type": "address" }, { "internalType": "address", "name": "token1", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "uint256", "name": "amount0Min", "type": "uint256" }, { "internalType": "uint256", "name": "amount1Min", "type": "uint256" }], "internalType": "struct IApproveAndCall.IncreaseLiquidityParams", "name": "params", "type": "tuple" }], "name": "increaseLiquidity", "outputs": [{ "internalType": "bytes", "name": "result", "type": "bytes" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "address", "name": "token0", "type": "address" }, { "internalType": "address", "name": "token1", "type": "address" }, { "internalType": "uint24", "name": "fee", "type": "uint24" }, { "internalType": "int24", "name": "tickLower", "type": "int24" }, { "internalType": "int24", "name": "tickUpper", "type": "int24" }, { "internalType": "uint256", "name": "amount0Min", "type": "uint256" }, { "internalType": "uint256", "name": "amount1Min", "type": "uint256" }, { "internalType": "address", "name": "recipient", "type": "address" }], "internalType": "struct IApproveAndCall.MintParams", "name": "params", "type": "tuple" }], "name": "mint", "outputs": [{ "internalType": "bytes", "name": "result", "type": "bytes" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "previousBlockhash", "type": "bytes32" }, { "internalType": "bytes[]", "name": "data", "type": "bytes[]" }], "name": "multicall", "outputs": [{ "internalType": "bytes[]", "name": "", "type": "bytes[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bytes[]", "name": "data", "type": "bytes[]" }], "name": "multicall", "outputs": [{ "internalType": "bytes[]", "name": "", "type": "bytes[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "bytes[]", "name": "data", "type": "bytes[]" }], "name": "multicall", "outputs": [{ "internalType": "bytes[]", "name": "results", "type": "bytes[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "positionManager", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "pull", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "refundETH", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "selfPermit", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "nonce", "type": "uint256" }, { "internalType": "uint256", "name": "expiry", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "selfPermitAllowed", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "nonce", "type": "uint256" }, { "internalType": "uint256", "name": "expiry", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "selfPermitAllowedIfNecessary", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "selfPermitIfNecessary", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }], "name": "swapExactTokensForTokens", "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "uint256", "name": "amountInMax", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }], "name": "swapTokensForExactTokens", "outputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }, { "internalType": "address", "name": "recipient", "type": "address" }], "name": "sweepToken", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }], "name": "sweepToken", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }, { "internalType": "uint256", "name": "feeBips", "type": "uint256" }, { "internalType": "address", "name": "feeRecipient", "type": "address" }], "name": "sweepTokenWithFee", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "feeBips", "type": "uint256" }, { "internalType": "address", "name": "feeRecipient", "type": "address" }], "name": "sweepTokenWithFee", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "int256", "name": "amount0Delta", "type": "int256" }, { "internalType": "int256", "name": "amount1Delta", "type": "int256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "uniswapV3SwapCallback", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }, { "internalType": "address", "name": "recipient", "type": "address" }], "name": "unwrapWETH9", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }], "name": "unwrapWETH9", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "feeBips", "type": "uint256" }, { "internalType": "address", "name": "feeRecipient", "type": "address" }], "name": "unwrapWETH9WithFee", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountMinimum", "type": "uint256" }, { "internalType": "uint256", "name": "feeBips", "type": "uint256" }, { "internalType": "address", "name": "feeRecipient", "type": "address" }], "name": "unwrapWETH9WithFee", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "wrapETH", "outputs": [], "stateMutability": "payable", "type": "function" }, { "stateMutability": "payable", "type": "receive" }]

var url = "wss://soft-wider-seed.discover.quiknode.pro/18703bb81651ec77cd7a7cade08a419b530beb21/";



var init = function () {
  var customWsProvider = new ethers.providers.WebSocketProvider(url);

  var UNISWAP_V3_SWAP_CONTRACT = "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
  var function_signature = "0x5ae401dc"
  var contract_name = "Uniswap V3 Swap"
  const iface = new ethers.utils.Interface(UNISWAP_V3_SWAP_CONTRACT_ABI);
  var CALLDATA;
  const web3 = new Web3();

  function extractParameters(signature) {
    let params = [];

    const allParameters = /\b[^()]+\((.*)\)$/gm;
    const splitParameters = /((\(.+?\))|([^,() ]+)){1}/gm;

    let _allParameters = allParameters.exec(signature)[1];

    while ((match = splitParameters.exec(_allParameters))) {
      params.push(match[0]);
    }

    return params;
  }

  async function decode(calls) {
    // let calls = web3.eth.abi.decodeParameter("bytes[]", calldata);

    for (let index = 0; index < calls.length; index++) {
      // console.log(`here`)
      let call = calls[index].replace("0x", "");
      let selector = call.slice(0, 8);
      let data = call.slice(8);
      // console.log(`selector: ${selector} data: ${data}`);
      let request = await axios.get(
        `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`
      );
      let signature = request.data.results[0].text_signature;

      console.log(
        `\nCall ${index} : \nSelector : ${selector} \nSignature : ${signature} \nData size : ${data.length}`
      );

      let parameters = extractParameters(signature);
      let decoded = web3.eth.abi.decodeParameters(parameters, data);

      // for (let i = 0; i < parameters.length; i++) {
      //   console.log(
      //     `\nParameter ${i} - Type : ${parameters[i]} - Value : ${decoded[i]}`
      //   );
      // }

      console.log(`\nParameter ${0} - Type : ${parameters[0]} - amountIn Value : ${ethers.utils.parseEther(decoded[0])} \nParameter ${1} - Type : ${ethers.utils.parseEther(parameters[1])} - amountOutMin Value : ${decoded[1]} \nParameter ${2} - Type : ${parameters[2]} - path : ${decoded[2]} \nParameter ${3} - Type : ${parameters[3]} - To : ${decoded[3]}`)
      
    }
  }

  async function decode_txn(transaction) {
    if (transaction) {
      if (transaction.to === '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' &&
        transaction.data.indexOf("0x5ae401dc") !== -1) {
        abiDecoder.addABI(UNISWAP_V3_SWAP_CONTRACT_ABI);
        const decodedData = abiDecoder.decodeMethod(transaction.data);
        console.log(transaction);
        console.log(decodedData)
        console.log((decodedData.params[1].value))
        multicall_data = (decodedData.params[1].value);
        await decode(multicall_data)
      } else {
        console.log(`Not ${contract_name}`)
      }
    }
    //
  }

  customWsProvider.on("pending", (tx) => {
    customWsProvider.getTransaction(tx).then(function (transaction) {

      decode_txn(transaction, UNISWAP_V3_SWAP_CONTRACT, function_signature);

    });
  });

  customWsProvider._websocket.on("error", async () => {
    console.log(`Unable to connect to ${ep.subdomain} retrying in 3s...`);
    setTimeout(init, 3000);
  });
  customWsProvider._websocket.on("close", async (code) => {
    console.log(
      `Connection lost with code ${code}! Attempting reconnect in 3s...`
    );
    customWsProvider._websocket.terminate();
    setTimeout(init, 3000);
  });
};

init();