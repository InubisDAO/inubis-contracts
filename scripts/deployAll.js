const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account: " + deployer.address);

    const DAI = "0xB2180448f8945C8Cc8AE9809E67D6bd27d8B2f2C";
    const oldINKH = "0xC0b491daBf3709Ee5Eb79E603D73289Ca6060932";
    const oldsINKH = "0x1Fecda1dE7b6951B248C0B62CaeBD5BAbedc2084";
    const oldStaking = "0xC5d3318C0d74a72cD7C55bdf844e24516796BaB2";
    const oldwsINKH = "0xe73384f11Bb748Aa0Bc20f7b02958DF573e6E2ad";
    const sushiRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
    const uniRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const oldTreasury = "0x0d722D813601E48b7DAcb2DF9bae282cFd98c6E7";

    const FRAX = "0x2f7249cb599139e560f0c81c269ab9b04799e453";
    const LUSD = "0x45754df05aa6305114004358ecf8d04ff3b84e26";

    const Authority = await ethers.getContractFactory("InubisAuthority");
    const authority = await Authority.deploy(
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address
    );

    const Migrator = await ethers.getContractFactory("InubisTokenMigrator");
    const migrator = await Migrator.deploy(
        oldINKH,
        oldsINKH,
        oldTreasury,
        oldStaking,
        oldwsINKH,
        sushiRouter,
        uniRouter,
        "0",
        authority.address
    );

    const firstEpochNumber = "550";
    const firstBlockNumber = "9505000";

    const INKH = await ethers.getContractFactory("InubisERC20Token");
    const inkh = await INKH.deploy(authority.address);

    const SINKH = await ethers.getContractFactory("sInubis");
    const sINKH = await SINKH.deploy();

    const GINKH = await ethers.getContractFactory("gINKH");
    const gINKH = await GINKH.deploy(migrator.address, sINKH.address);

    await migrator.setgINKH(gINKH.address);

    const InubisTreasury = await ethers.getContractFactory("InubisTreasury");
    const inubisTreasury = await InubisTreasury.deploy(inkh.address, "0", authority.address);

    await inubisTreasury.queueTimelock("0", migrator.address, migrator.address);
    await inubisTreasury.queueTimelock("8", migrator.address, migrator.address);
    await inubisTreasury.queueTimelock("2", DAI, DAI);
    await inubisTreasury.queueTimelock("2", FRAX, FRAX);
    await inubisTreasury.queueTimelock("2", LUSD, LUSD);

    await authority.pushVault(inubisTreasury.address, true); // replaces inkh.setVault(treasury.address)

    const InubisStaking = await ethers.getContractFactory("InubisStaking");
    const staking = await InubisStaking.deploy(
        inkh.address,
        sINKH.address,
        gINKH.address,
        "2200",
        firstEpochNumber,
        firstBlockNumber,
        authority.address
    );

    const Distributor = await ethers.getContractFactory("Distributor");
    const distributor = await Distributor.deploy(
        inubisTreasury.address,
        inkh.address,
        staking.address,
        authority.address
    );

    // Initialize sinkh
    await sINKH.setIndex("7675210820");
    await sINKH.setgINKH(gINKH.address);
    await sINKH.initialize(staking.address, inubisTreasury.address);

    await staking.setDistributor(distributor.address);

    await inubisTreasury.execute("0");
    await inubisTreasury.execute("1");
    await inubisTreasury.execute("2");
    await inubisTreasury.execute("3");
    await inubisTreasury.execute("4");

    console.log("Inubis Authority: ", authority.address);
    console.log("INKH: " + inkh.address);
    console.log("sInkh: " + sINKH.address);
    console.log("gINKH: " + gINKH.address);
    console.log("Inubis Treasury: " + inubisTreasury.address);
    console.log("Staking Contract: " + staking.address);
    console.log("Distributor: " + distributor.address);
    console.log("Migrator: " + migrator.address);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
