import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";

import { InubisERC20Token, InubisERC20Token__factory, InubisAuthority__factory } from "../../types";

describe("InubisTest", () => {
    let deployer: SignerWithAddress;
    let vault: SignerWithAddress;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let inkh: InubisERC20Token;

    beforeEach(async () => {
        [deployer, vault, bob, alice] = await ethers.getSigners();

        const authority = await new InubisAuthority__factory(deployer).deploy(
            deployer.address,
            deployer.address,
            deployer.address,
            vault.address
        );
        await authority.deployed();

        inkh = await new InubisERC20Token__factory(deployer).deploy(authority.address);
    });

    it("correctly constructs an ERC20", async () => {
        expect(await inkh.name()).to.equal("Inubis");
        expect(await inkh.symbol()).to.equal("INKH");
        expect(await inkh.decimals()).to.equal(9);
    });

    describe("mint", () => {
        it("must be done by vault", async () => {
            await expect(inkh.connect(deployer).mint(bob.address, 100)).to.be.revertedWith(
                "UNAUTHORIZED"
            );
        });

        it("increases total supply", async () => {
            let supplyBefore = await inkh.totalSupply();
            await inkh.connect(vault).mint(bob.address, 100);
            expect(supplyBefore.add(100)).to.equal(await inkh.totalSupply());
        });
    });

    describe("burn", () => {
        beforeEach(async () => {
            await inkh.connect(vault).mint(bob.address, 100);
        });

        it("reduces the total supply", async () => {
            let supplyBefore = await inkh.totalSupply();
            await inkh.connect(bob).burn(10);
            expect(supplyBefore.sub(10)).to.equal(await inkh.totalSupply());
        });

        it("cannot exceed total supply", async () => {
            let supply = await inkh.totalSupply();
            await expect(inkh.connect(bob).burn(supply.add(1))).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });

        it("cannot exceed bob's balance", async () => {
            await inkh.connect(vault).mint(alice.address, 15);
            await expect(inkh.connect(alice).burn(16)).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });
    });
});
