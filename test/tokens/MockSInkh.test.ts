import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MockSINKH__factory, MockSINKH } from "../../types";

describe("Mock sInkh Tests", () => {
    // 100 sINKH
    const INITIAL_AMOUNT = "100000000000";

    let initializer: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let sInkh: MockSINKH;

    beforeEach(async () => {
        [initializer, alice, bob] = await ethers.getSigners();

        // Initialize to index of 1 and rebase percentage of 1%
        sInkh = await new MockSINKH__factory(initializer).deploy("1000000000", "10000000");

        // Mint 100 sINKH for intializer account
        await sInkh.mint(initializer.address, INITIAL_AMOUNT);
    });

    it("should rebase properly", async () => {
        expect(await sInkh.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("100000000000");
        expect(await sInkh.index()).to.equal("1000000000");

        await sInkh.rebase();
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("100000000000");
        expect(await sInkh.balanceOf(initializer.address)).to.equal("101000000000");
        expect(await sInkh.index()).to.equal("1010000000");
    });

    it("should transfer properly", async () => {
        expect(await sInkh.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("100000000000");

        //await sInkh.approve(bob.address, INITIAL_AMOUNT);
        await sInkh.transfer(bob.address, INITIAL_AMOUNT);

        expect(await sInkh.balanceOf(initializer.address)).to.equal("0");
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("0");

        expect(await sInkh.balanceOf(bob.address)).to.equal(INITIAL_AMOUNT);
        expect(await sInkh._agnosticBalance(bob.address)).to.equal("100000000000");
    });

    it("should transfer properly after rebase", async () => {
        const afterRebase = "101000000000";

        expect(await sInkh.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("100000000000");

        await sInkh.rebase();
        expect(await sInkh.balanceOf(initializer.address)).to.equal(afterRebase);
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("100000000000");

        const rebasedAmount = "1000000000";
        await sInkh.transfer(bob.address, rebasedAmount); // Transfer rebased amount

        expect(await sInkh.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sInkh._agnosticBalance(initializer.address)).to.equal("99009900991");

        expect(await sInkh.balanceOf(bob.address)).to.equal(Number(rebasedAmount) - 1); // Precision error ;(
        expect(await sInkh._agnosticBalance(bob.address)).to.equal("990099009");
    });

    it("should drip funds to users", async () => {
        expect(await sInkh.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);

        await sInkh.drip();

        expect(await sInkh.balanceOf(initializer.address)).to.equal("200000000000");
    });
});
