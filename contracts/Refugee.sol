import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Refugee is Ownable {
    
    struct Donation {
        uint256 id;
        address recipient;
        uint256 goalAmount;
        uint256 deadline;
        uint256 currentAmount;
        uint256 donorCount;
    }

    Donation[] public activeDonations;
    uint256 public nextDonationID;
    IERC20 public usdcToken;

    event DonationCreated(uint256 id, address indexed recipient, uint256 goalAmount, uint256 deadline);
    event DonationReceived(uint256 id, address indexed donor, uint256 amount);
    event FundsWithdrawn(uint256 id, uint256 amount);
    event DonationRemoved(uint256 id);

    constructor(address usdcTokenAddress) {
        usdcToken = IERC20(usdcTokenAddress);
        nextDonationID = 0;
    }

    // Admin function to remove donation
    function removeDonation(uint256 id) public onlyOwner {
        uint256 donationIndex = getActiveDonationIndex(id);
        require(donationIndex != type(uint256).max, "Donation does not exist");

        // Remove the donation
        _removeDonation(donationIndex);
        emit DonationRemoved(id);
    }

    // Create a new donation campaign
    function createDonation(address recipient, uint256 goalAmount, uint256 durationInSeconds) public onlyOwner returns (uint256) {
        uint256 deadline = block.timestamp + durationInSeconds;
        Donation memory newDonation = Donation({
            id: nextDonationID,
            recipient: recipient,
            goalAmount: goalAmount,
            deadline: deadline,
            currentAmount: 0,
            donorCount: 0
        });

        activeDonations.push(newDonation);
        emit DonationCreated(nextDonationID, recipient, goalAmount, deadline);
        nextDonationID++;

        return newDonation.id;
    }

    // Donate to a specific donation campaign
    function donate(uint256 donationID, uint256 amount) public {
        uint256 donationIndex = getActiveDonationIndex(donationID);
        require(donationIndex != type(uint256).max, "Donation does not exist");
        require(block.timestamp <= activeDonations[donationIndex].deadline, "Donation period has ended");

        Donation storage donation = activeDonations[donationIndex];
        
        // Transfer USDC from donor to this contract
        require(usdcToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update donation details
        donation.currentAmount += amount;
        donation.donorCount += 1;

        emit DonationReceived(donationID, msg.sender, amount);

        // Check if the goal is reached
        if (donation.currentAmount >= donation.goalAmount) {
            _removeDonation(donationIndex);
        }
    }

    // Withdraw funds for a donation after the deadline
    function withdrawFunds(uint256 donationID) public {
        uint256 donationIndex = getActiveDonationIndex(donationID);
        require(donationIndex != type(uint256).max, "Donation does not exist");
        Donation storage donation = activeDonations[donationIndex];
        require(block.timestamp > donation.deadline, "Donation period has not ended yet");
        require(donation.currentAmount > 0, "No funds to withdraw");

        uint256 amountToWithdraw = donation.currentAmount;

        // Transfer USDC to the recipient
        require(usdcToken.transfer(donation.recipient, amountToWithdraw), "Withdraw transfer failed");

        emit FundsWithdrawn(donationID, amountToWithdraw);

        // Remove the donation
        _removeDonation(donationIndex);
    }

    // Get all active donations
    function getActiveDonations() public view returns (Donation[] memory) {
        return activeDonations;
    }

    // Internal helper to remove a donation from the active donations list
    function _removeDonation(uint256 index) internal {
        activeDonations[index] = activeDonations[activeDonations.length - 1];
        activeDonations.pop();
    }

    // Helper to get the index of a donation in the active donations array
    function getActiveDonationIndex(uint256 id) internal view returns (uint256) {
        for (uint256 i = 0; i < activeDonations.length; i++) {
            if (activeDonations[i].id == id) {
                return i;
            }
        }
        return type(uint256).max; // Return max value if not found
    }
}