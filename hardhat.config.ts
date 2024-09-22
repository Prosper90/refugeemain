import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          viaIR: true, // Add this line
        },
      },
    ],
  },
  allowUnlimitedContractSize: true,
  networks: {
    hardhat: {
      chainId: 555,
    },
    polygon_main: {
      url: process.env.POLYGONMAIN,
      accounts: [process.env.PRIVATE_KEY],
    },
    sepolia_test: {
      url: process.env.SEPOLIATEST,
      accounts: [process.env.PRIVATE_KEY_TEST],
    },
  },
  etherscan: {
    apiKey: process.env.VERIFYAPI,
  },
};
