const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account: " + deployer.address);

    const firstEpochNumber = "";
    const firstBlockNumber = "";
    const gINKH = "";
    const authority = "";

    const INKH = await ethers.getContractFactory("InubisERC20Token");
    const inkh = await INKH.deploy(authority);

    const InubisTreasury = await ethers.getContractFactory("InubisTreasury");
    const inubisTreasury = await InubisTreasury.deploy(inkh.address, "0", authority);

    const SINKH = await ethers.getContractFactory("sInubis");
    const sINKH = await SINKH.deploy();

    const InubisStaking = await ethers.getContractFactory("InubisStaking");
    const staking = await InubisStaking.deploy(
        inkh.address,
        sINKH.address,
        gINKH,
        "2200",
        firstEpochNumber,
        firstBlockNumber,
        authority
    );

    const Distributor = await ethers.getContractFactory("Distributor");
    const distributor = await Distributor.deploy(
        inubisTreasury.address,
        inkh.address,
        staking.address,
        authority
    );

    await sINKH.setIndex("");
    await sINKH.setgINKH(gINKH);
    await sINKH.initialize(staking.address, inubisTreasury.address);

    console.log("INKH: " + inkh.address);
    console.log("Inubis Treasury: " + inubisTreasury.address);
    console.log("Staked Inubis: " + sINKH.address);
    console.log("Staking Contract: " + staking.address);
    console.log("Distributor: " + distributor.address);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
