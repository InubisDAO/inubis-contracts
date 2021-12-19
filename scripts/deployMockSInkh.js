const { ethers } = require("hardhat");

async function main() {
    // Initialize sINKH to index of 1 and rebase percentage of 1%
    const mockSInkhFactory = await ethers.getContractFactory("MockSINKH");
    const mockSInkh = await mockSInkhFactory.deploy("1000000000", "10000000");

    console.log("SINKH DEPLOYED AT", mockSInkh.address);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
