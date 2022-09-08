require("@nomiclabs/hardhat-waffle")

require('dotenv').config({path: ".env.local" })
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 1_000_000,
          },
          metadata: {
            bytecodeHash: "none",
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_URL_MAINNET,
      },
    },
  },
  // mocha: {
  //   timeout: 100000000,
  // },
}