const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account: " + deployer.address);

    const oldsINKH = "0x1Fecda1dE7b6951B248C0B62CaeBD5BAbedc2084";

    const WSINKH = await ethers.getContractFactory("wINKH");
    const wsINKH = await WSINKH.deploy(oldsINKH);

    console.log("old wsINKH: " + wsINKH.address);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
