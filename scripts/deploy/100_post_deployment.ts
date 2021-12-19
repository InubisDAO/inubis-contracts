import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { waitFor } from "../txHelper";
import { CONTRACTS, INITIAL_REWARD_RATE, INITIAL_INDEX, BOUNTY_AMOUNT } from "../constants";
import {
    InubisAuthority__factory,
    Distributor__factory,
    InubisERC20Token__factory,
    InubisStaking__factory,
    SInubis__factory,
    GINKH__factory,
    InubisTreasury__factory,
    LUSDAllocator__factory,
} from "../../types";

// TODO: Shouldn't run setup methods if the contracts weren't redeployed.
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.provider.getSigner(deployer);

    const authorityDeployment = await deployments.get(CONTRACTS.authority);
    const inkhDeployment = await deployments.get(CONTRACTS.inkh);
    const sInkhDeployment = await deployments.get(CONTRACTS.sInkh);
    const gInkhDeployment = await deployments.get(CONTRACTS.gInkh);
    const distributorDeployment = await deployments.get(CONTRACTS.distributor);
    const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
    const stakingDeployment = await deployments.get(CONTRACTS.staking);
    const lusdAllocatorDeployment = await deployments.get(CONTRACTS.lusdAllocator);

    const authorityContract = await InubisAuthority__factory.connect(
        authorityDeployment.address,
        signer
    );
    const inkh = InubisERC20Token__factory.connect(inkhDeployment.address, signer);
    const sInkh = SInubis__factory.connect(sInkhDeployment.address, signer);
    const gInkh = GINKH__factory.connect(gInkhDeployment.address, signer);
    const distributor = Distributor__factory.connect(distributorDeployment.address, signer);
    const staking = InubisStaking__factory.connect(stakingDeployment.address, signer);
    const treasury = InubisTreasury__factory.connect(treasuryDeployment.address, signer);
    const lusdAllocator = LUSDAllocator__factory.connect(lusdAllocatorDeployment.address, signer);

    // Step 1: Set treasury as vault on authority
    await waitFor(authorityContract.pushVault(treasury.address, true));
    console.log("Setup -- authorityContract.pushVault: set vault on authority");

    // Step 2: Set distributor as minter on treasury
    await waitFor(treasury.enable(8, distributor.address, ethers.constants.AddressZero)); // Allows distributor to mint inkh.
    console.log("Setup -- treasury.enable(8):  distributor enabled to mint inkh on treasury");

    // Step 3: Set distributor on staking
    await waitFor(staking.setDistributor(distributor.address));
    console.log("Setup -- staking.setDistributor:  distributor set on staking");

    // Step 4: Initialize sINKH and set the index
    if ((await sInkh.gINKH()) == ethers.constants.AddressZero) {
        await waitFor(sInkh.setIndex(INITIAL_INDEX)); // TODO
        await waitFor(sInkh.setgINKH(gInkh.address));
        await waitFor(sInkh.initialize(staking.address, treasuryDeployment.address));
    }
    console.log("Setup -- sinkh initialized (index, ginkh)");

    // Step 5: Set up distributor with bounty and recipient
    await waitFor(distributor.setBounty(BOUNTY_AMOUNT));
    await waitFor(distributor.addRecipient(staking.address, INITIAL_REWARD_RATE));
    console.log("Setup -- distributor.setBounty && distributor.addRecipient");

    // Approve staking contact to spend deployer's INKH
    // TODO: Is this needed?
    // await inkh.approve(staking.address, LARGE_APPROVAL);
};

func.tags = ["setup"];
func.dependencies = [CONTRACTS.inkh, CONTRACTS.sInkh, CONTRACTS.gInkh];

export default func;
