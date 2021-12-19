import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";

import {
    InubisStaking,
    InubisTreasury,
    InubisERC20Token,
    InubisERC20Token__factory,
    SInubis,
    SInubis__factory,
    GINKH,
    InubisAuthority__factory,
} from "../../types";

const TOTAL_GONS = 5000000000000000;
const ZERO_ADDRESS = ethers.utils.getAddress("0x0000000000000000000000000000000000000000");

describe("sInkh", () => {
    let initializer: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let inkh: InubisERC20Token;
    let sInkh: SInubis;
    let gInkhFake: FakeContract<GINKH>;
    let stakingFake: FakeContract<InubisStaking>;
    let treasuryFake: FakeContract<InubisTreasury>;

    beforeEach(async () => {
        [initializer, alice, bob] = await ethers.getSigners();
        stakingFake = await smock.fake<InubisStaking>("InubisStaking");
        treasuryFake = await smock.fake<InubisTreasury>("InubisTreasury");
        gInkhFake = await smock.fake<GINKH>("gINKH");

        const authority = await new InubisAuthority__factory(initializer).deploy(
            initializer.address,
            initializer.address,
            initializer.address,
            initializer.address
        );
        inkh = await new InubisERC20Token__factory(initializer).deploy(authority.address);
        sInkh = await new SInubis__factory(initializer).deploy();
    });

    it("is constructed correctly", async () => {
        expect(await sInkh.name()).to.equal("Staked INKH");
        expect(await sInkh.symbol()).to.equal("sINKH");
        expect(await sInkh.decimals()).to.equal(9);
    });

    describe("initialization", () => {
        describe("setIndex", () => {
            it("sets the index", async () => {
                await sInkh.connect(initializer).setIndex(3);
                expect(await sInkh.index()).to.equal(3);
            });

            it("must be done by the initializer", async () => {
                await expect(sInkh.connect(alice).setIndex(3)).to.be.reverted;
            });

            it("cannot update the index if already set", async () => {
                await sInkh.connect(initializer).setIndex(3);
                await expect(sInkh.connect(initializer).setIndex(3)).to.be.reverted;
            });
        });

        describe("setgINKH", () => {
            it("sets gInkhFake", async () => {
                await sInkh.connect(initializer).setgINKH(gInkhFake.address);
                expect(await sInkh.gINKH()).to.equal(gInkhFake.address);
            });

            it("must be done by the initializer", async () => {
                await expect(sInkh.connect(alice).setgINKH(gInkhFake.address)).to.be.reverted;
            });

            it("won't set gInkhFake to 0 address", async () => {
                await expect(sInkh.connect(initializer).setgINKH(ZERO_ADDRESS)).to.be.reverted;
            });
        });

        describe("initialize", () => {
            it("assigns TOTAL_GONS to the stakingFake contract's balance", async () => {
                await sInkh
                    .connect(initializer)
                    .initialize(stakingFake.address, treasuryFake.address);
                expect(await sInkh.balanceOf(stakingFake.address)).to.equal(TOTAL_GONS);
            });

            it("emits Transfer event", async () => {
                await expect(
                    sInkh.connect(initializer).initialize(stakingFake.address, treasuryFake.address)
                )
                    .to.emit(sInkh, "Transfer")
                    .withArgs(ZERO_ADDRESS, stakingFake.address, TOTAL_GONS);
            });

            it("emits LogStakingContractUpdated event", async () => {
                await expect(
                    sInkh.connect(initializer).initialize(stakingFake.address, treasuryFake.address)
                )
                    .to.emit(sInkh, "LogStakingContractUpdated")
                    .withArgs(stakingFake.address);
            });

            it("unsets the initializer, so it cannot be called again", async () => {
                await sInkh
                    .connect(initializer)
                    .initialize(stakingFake.address, treasuryFake.address);
                await expect(
                    sInkh.connect(initializer).initialize(stakingFake.address, treasuryFake.address)
                ).to.be.reverted;
            });
        });
    });

    describe("post-initialization", () => {
        beforeEach(async () => {
            await sInkh.connect(initializer).setIndex(1);
            await sInkh.connect(initializer).setgINKH(gInkhFake.address);
            await sInkh.connect(initializer).initialize(stakingFake.address, treasuryFake.address);
        });

        describe("approve", () => {
            it("sets the allowed value between sender and spender", async () => {
                await sInkh.connect(alice).approve(bob.address, 10);
                expect(await sInkh.allowance(alice.address, bob.address)).to.equal(10);
            });

            it("emits an Approval event", async () => {
                await expect(await sInkh.connect(alice).approve(bob.address, 10))
                    .to.emit(sInkh, "Approval")
                    .withArgs(alice.address, bob.address, 10);
            });
        });

        describe("increaseAllowance", () => {
            it("increases the allowance between sender and spender", async () => {
                await sInkh.connect(alice).approve(bob.address, 10);
                await sInkh.connect(alice).increaseAllowance(bob.address, 4);

                expect(await sInkh.allowance(alice.address, bob.address)).to.equal(14);
            });

            it("emits an Approval event", async () => {
                await sInkh.connect(alice).approve(bob.address, 10);
                await expect(await sInkh.connect(alice).increaseAllowance(bob.address, 4))
                    .to.emit(sInkh, "Approval")
                    .withArgs(alice.address, bob.address, 14);
            });
        });

        describe("decreaseAllowance", () => {
            it("decreases the allowance between sender and spender", async () => {
                await sInkh.connect(alice).approve(bob.address, 10);
                await sInkh.connect(alice).decreaseAllowance(bob.address, 4);

                expect(await sInkh.allowance(alice.address, bob.address)).to.equal(6);
            });

            it("will not make the value negative", async () => {
                await sInkh.connect(alice).approve(bob.address, 10);
                await sInkh.connect(alice).decreaseAllowance(bob.address, 11);

                expect(await sInkh.allowance(alice.address, bob.address)).to.equal(0);
            });

            it("emits an Approval event", async () => {
                await sInkh.connect(alice).approve(bob.address, 10);
                await expect(await sInkh.connect(alice).decreaseAllowance(bob.address, 4))
                    .to.emit(sInkh, "Approval")
                    .withArgs(alice.address, bob.address, 6);
            });
        });

        describe("circulatingSupply", () => {
            it("is zero when all owned by stakingFake contract", async () => {
                await stakingFake.supplyInWarmup.returns(0);
                await gInkhFake.totalSupply.returns(0);
                await gInkhFake.balanceFrom.returns(0);

                const totalSupply = await sInkh.circulatingSupply();
                expect(totalSupply).to.equal(0);
            });

            it("includes all supply owned by gInkhFake", async () => {
                await stakingFake.supplyInWarmup.returns(0);
                await gInkhFake.totalSupply.returns(10);
                await gInkhFake.balanceFrom.returns(10);

                const totalSupply = await sInkh.circulatingSupply();
                expect(totalSupply).to.equal(10);
            });

            it("includes all supply in warmup in stakingFake contract", async () => {
                await stakingFake.supplyInWarmup.returns(50);
                await gInkhFake.totalSupply.returns(0);
                await gInkhFake.balanceFrom.returns(0);

                const totalSupply = await sInkh.circulatingSupply();
                expect(totalSupply).to.equal(50);
            });
        });
    });
});
