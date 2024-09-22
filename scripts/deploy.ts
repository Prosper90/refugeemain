import { ethers } from "hardhat";

// async function main() {
//   const currentTimestampInSeconds = Math.round(Date.now() / 1000);
//   const unlockTime = currentTimestampInSeconds + 60;

//   const lockedAmount = ethers.utils.parseEther("0.001");

//   const Lock = await ethers.getContractFactory("Lock");
//   const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

//   await lock.deployed();

//   console.log(
//     `Lock with ${ethers.utils.formatEther(lockedAmount)}ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`
//   );
// }

{
  /* Mock */
}
async function main() {
  const MockUsdc = await ethers.getContractFactory("MockUSDC");
  const deployMock = await MockUsdc.deploy();

  await deployMock.deployed();

  console.log(`Mock deployed to ${deployMock.address}`);
}

{
  /* Refugee */
}
// async function main() {
//   const Refugee = await ethers.getContractFactory("Refugee");
//   const deployRefugee = await Refugee.deploy("");

//   await deployRefugee.deployed();

//   console.log(`Refugee deployed to ${deployRefugee.address}`);
// }

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
