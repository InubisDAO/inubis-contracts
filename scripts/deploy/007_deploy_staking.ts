import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
    CONTRACTS,
    EPOCH_LENGTH_IN_BLOCKS,
    FIRST_EPOCH_TIME,
    FIRST_EPOCH_NUMBER,
} from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const authorityDeployment = await deployments.get(CONTRACTS.authority);
    const inkhDeployment = await deployments.get(CONTRACTS.inkh);
    const sInkhDeployment = await deployments.get(CONTRACTS.sInkh);
    const gInkhDeployment = await deployments.get(CONTRACTS.gInkh);

    await deploy(CONTRACTS.staking, {
        from: deployer,
        args: [
            inkhDeployment.address,
            sInkhDeployment.address,
            gInkhDeployment.address,
            EPOCH_LENGTH_IN_BLOCKS,
            FIRST_EPOCH_NUMBER,
            FIRST_EPOCH_TIME,
            authorityDeployment.address,
        ],
        log: true,
    });
};

func.tags = [CONTRACTS.staking, "staking"];
func.dependencies = [CONTRACTS.inkh, CONTRACTS.sInkh, CONTRACTS.gInkh];

export default func;
