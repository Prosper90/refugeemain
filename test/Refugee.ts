import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, SignerWithAddress } from "ethers";
import { getContractFactory } from "hardhat/types";

describe("Refugee", function () {
  let Refugee: getContractFactory;
  let refugee: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let usdcToken: Contract;

  beforeEach(async function () {
    // Deploy a mock USDC token
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdcToken = await MockUSDC.deploy();
    await usdcToken.deployed();

    // Deploy the Refugee contract
    Refugee = await ethers.getContractFactory("Refugee");
    [owner, addr1, addr2] = await ethers.getSigners();
    refugee = await Refugee.deploy(usdcToken.address);
    await refugee.deployed();

    // Mint some USDC tokens for testing
    await usdcToken.mint(addr1.address, ethers.utils.parseUnits("1000", 6));
    await usdcToken.mint(addr2.address, ethers.utils.parseUnits("1000", 6));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await refugee.owner()).to.equal(owner.address);
    });

    it("Should set the correct USDC token address", async function () {
      expect(await refugee.usdcToken()).to.equal(usdcToken.address);
    });
  });

  describe("Creating donations", function () {
    it("Should create a new donation", async function () {
      const goalAmount = ethers.utils.parseUnits("100", 6);
      const duration = 86400; // 1 day
      await expect(refugee.createDonation(addr1.address, goalAmount, duration))
        .to.emit(refugee, "DonationCreated")
        .withArgs(
          0,
          addr1.address,
          goalAmount,
          await ethers.provider
            .getBlock("latest")
            .then((b) => b.timestamp + duration)
        );

      const donations = await refugee.getActiveDonations();
      expect(donations.length).to.equal(1);
      expect(donations[0].recipient).to.equal(addr1.address);
    });

    it("Should only allow owner to create donations", async function () {
      await expect(
        refugee.connect(addr1).createDonation(addr2.address, 100, 86400)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Donating", function () {
    beforeEach(async function () {
      await refugee.createDonation(
        addr1.address,
        ethers.utils.parseUnits("100", 6),
        86400
      );
      await usdcToken
        .connect(addr2)
        .approve(refugee.address, ethers.utils.parseUnits("50", 6));
    });

    it("Should allow donations to an active campaign", async function () {
      await expect(
        refugee.connect(addr2).donate(0, ethers.utils.parseUnits("50", 6))
      )
        .to.emit(refugee, "DonationReceived")
        .withArgs(0, addr2.address, ethers.utils.parseUnits("50", 6));

      const donations = await refugee.getActiveDonations();
      expect(donations[0].currentAmount).to.equal(
        ethers.utils.parseUnits("50", 6)
      );
      expect(donations[0].donorCount).to.equal(1);
    });

    it("Should not allow donations after deadline", async function () {
      await ethers.provider.send("evm_increaseTime", [86401]); // Increase time by 1 day + 1 second
      await ethers.provider.send("evm_mine");

      await expect(
        refugee.connect(addr2).donate(0, ethers.utils.parseUnits("50", 6))
      ).to.be.revertedWith("Donation period has ended");
    });

    it("Should remove donation when goal is reached", async function () {
      await refugee.connect(addr2).donate(0, ethers.utils.parseUnits("100", 6));
      const donations = await refugee.getActiveDonations();
      expect(donations.length).to.equal(0);
    });
  });

  describe("Withdrawing funds", function () {
    beforeEach(async function () {
      await refugee.createDonation(
        addr1.address,
        ethers.utils.parseUnits("100", 6),
        86400
      );
      await usdcToken
        .connect(addr2)
        .approve(refugee.address, ethers.utils.parseUnits("50", 6));
      await refugee.connect(addr2).donate(0, ethers.utils.parseUnits("50", 6));
    });

    it("Should allow withdrawal after deadline", async function () {
      await ethers.provider.send("evm_increaseTime", [86401]); // Increase time by 1 day + 1 second
      await ethers.provider.send("evm_mine");

      await expect(refugee.withdrawFunds(0))
        .to.emit(refugee, "FundsWithdrawn")
        .withArgs(0, ethers.utils.parseUnits("50", 6));

      const recipientBalance = await usdcToken.balanceOf(addr1.address);
      expect(recipientBalance).to.equal(ethers.utils.parseUnits("50", 6));

      const donations = await refugee.getActiveDonations();
      expect(donations.length).to.equal(0);
    });

    it("Should not allow withdrawal before deadline", async function () {
      await expect(refugee.withdrawFunds(0)).to.be.revertedWith(
        "Donation period has not ended yet"
      );
    });
  });

  describe("Removing donations", function () {
    beforeEach(async function () {
      await refugee.createDonation(
        addr1.address,
        ethers.utils.parseUnits("100", 6),
        86400
      );
    });

    it("Should allow owner to remove a donation", async function () {
      await expect(refugee.removeDonation(0))
        .to.emit(refugee, "DonationRemoved")
        .withArgs(0);

      const donations = await refugee.getActiveDonations();
      expect(donations.length).to.equal(0);
    });

    it("Should not allow non-owners to remove a donation", async function () {
      await expect(refugee.connect(addr1).removeDonation(0)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});
