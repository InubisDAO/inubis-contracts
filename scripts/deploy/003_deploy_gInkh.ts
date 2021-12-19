import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONTRACTS } from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const sInkhDeployment = await deployments.get(CONTRACTS.sInkh);
    const migratorDeployment = await deployments.get(CONTRACTS.migrator);

    await deploy(CONTRACTS.gInkh, {
        from: deployer,
        args: [migratorDeployment.address, sInkhDeployment.address],
        log: true,
        skipIfAlreadyDeployed: true,
    });
};

func.tags = [CONTRACTS.gInkh, "migration", "tokens"];
func.dependencies = [CONTRACTS.migrator];

export default func;
