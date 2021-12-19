// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.7.5;
pragma abicoder v2;

import "ds-test/test.sol"; // ds-test

import "../../../contracts/libraries/SafeMath.sol";
import "../../../contracts/libraries/FixedPoint.sol";
import "../../../contracts/libraries/FullMath.sol";
import "../../../contracts/Staking.sol";
import "../../../contracts/InubisERC20.sol";
import "../../../contracts/sInubisERC20.sol";
import "../../../contracts/governance/gINKH.sol";
import "../../../contracts/Treasury.sol";
import "../../../contracts/StakingDistributor.sol";
import "../../../contracts/InubisAuthority.sol";

import "./util/Hevm.sol";
import "./util/MockContract.sol";

contract StakingTest is DSTest {
    using FixedPoint for *;
    using SafeMath for uint256;
    using SafeMath for uint112;

    InubisStaking internal staking;
    InubisTreasury internal treasury;
    InubisAuthority internal authority;
    Distributor internal distributor;

    InubisERC20Token internal inkh;
    sInubis internal sinkh;
    gINKH internal ginkh;

    MockContract internal mockToken;

    /// @dev Hevm setup
    Hevm internal constant hevm = Hevm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    uint256 internal constant AMOUNT = 1000;
    uint256 internal constant EPOCH_LENGTH = 8; // In Seconds
    uint256 internal constant START_TIME = 0; // Starting at this epoch
    uint256 internal constant NEXT_REBASE_TIME = 1; // Next epoch is here
    uint256 internal constant BOUNTY = 42;

    function setUp() public {
        // Start at timestamp
        hevm.warp(START_TIME);

        // Setup mockToken to deposit into treasury (for excess reserves)
        mockToken = new MockContract();
        mockToken.givenMethodReturn(abi.encodeWithSelector(ERC20.name.selector), abi.encode("mock DAO"));
        mockToken.givenMethodReturn(abi.encodeWithSelector(ERC20.symbol.selector), abi.encode("MOCK"));
        mockToken.givenMethodReturnUint(abi.encodeWithSelector(ERC20.decimals.selector), 18);
        mockToken.givenMethodReturnBool(abi.encodeWithSelector(IERC20.transferFrom.selector), true);

        authority = new InubisAuthority(address(this), address(this), address(this), address(this));

        inkh = new InubisERC20Token(address(authority));
        ginkh = new gINKH(address(this), address(this));
        sinkh = new sInubis();
        sinkh.setIndex(10);
        sinkh.setgINKH(address(ginkh));

        treasury = new InubisTreasury(address(inkh), 1, address(authority));

        staking = new InubisStaking(
            address(inkh),
            address(sinkh),
            address(ginkh),
            EPOCH_LENGTH,
            START_TIME,
            NEXT_REBASE_TIME,
            address(authority)
        );

        distributor = new Distributor(address(treasury), address(inkh), address(staking), address(authority));
        distributor.setBounty(BOUNTY);
        staking.setDistributor(address(distributor));
        treasury.enable(InubisTreasury.STATUS.REWARDMANAGER, address(distributor), address(0)); // Allows distributor to mint inkh.
        treasury.enable(InubisTreasury.STATUS.RESERVETOKEN, address(mockToken), address(0)); // Allow mock token to be deposited into treasury
        treasury.enable(InubisTreasury.STATUS.RESERVEDEPOSITOR, address(this), address(0)); // Allow this contract to deposit token into treeasury

        sinkh.initialize(address(staking), address(treasury));
        ginkh.migrate(address(staking), address(sinkh));

        // Give the treasury permissions to mint
        authority.pushVault(address(treasury), true);

        // Deposit a token who's profit (3rd param) determines how much inkh the treasury can mint
        uint256 depositAmount = 20e18;
        treasury.deposit(depositAmount, address(mockToken), BOUNTY.mul(2)); // Mints (depositAmount- 2xBounty) for this contract
    }

    function testStakeNoBalance() public {
        uint256 newAmount = AMOUNT.mul(2);
        try staking.stake(address(this), newAmount, true, true) {
            fail();
        } catch Error(string memory error) {
            assertEq(error, "TRANSFER_FROM_FAILED"); // Should be 'Transfer exceeds balance'
        }
    }

    function testStakeWithoutAllowance() public {
        try staking.stake(address(this), AMOUNT, true, true) {
            fail();
        } catch Error(string memory error) {
            assertEq(error, "TRANSFER_FROM_FAILED"); // Should be 'Transfer exceeds allowance'
        }
    }

    function testStake() public {
        inkh.approve(address(staking), AMOUNT);
        uint256 amountStaked = staking.stake(address(this), AMOUNT, true, true);
        assertEq(amountStaked, AMOUNT);
    }

    function testStakeAtRebaseToGinkh() public {
        // Move into next rebase window
        hevm.warp(EPOCH_LENGTH);

        inkh.approve(address(staking), AMOUNT);
        bool isSinkh = false;
        bool claim = true;
        uint256 gINKHRecieved = staking.stake(address(this), AMOUNT, isSinkh, claim);

        uint256 expectedAmount = ginkh.balanceTo(AMOUNT.add(BOUNTY));
        assertEq(gINKHRecieved, expectedAmount);
    }

    function testStakeAtRebase() public {
        // Move into next rebase window
        hevm.warp(EPOCH_LENGTH);

        inkh.approve(address(staking), AMOUNT);
        bool isSinkh = true;
        bool claim = true;
        uint256 amountStaked = staking.stake(address(this), AMOUNT, isSinkh, claim);

        uint256 expectedAmount = AMOUNT.add(BOUNTY);
        assertEq(amountStaked, expectedAmount);
    }

    function testUnstake() public {
        bool triggerRebase = true;
        bool isSinkh = true;
        bool claim = true;

        // Stake the inkh
        uint256 initialInkhBalance = inkh.balanceOf(address(this));
        inkh.approve(address(staking), initialInkhBalance);
        uint256 amountStaked = staking.stake(address(this), initialInkhBalance, isSinkh, claim);
        assertEq(amountStaked, initialInkhBalance);

        // Validate balances post stake
        uint256 inkhBalance = inkh.balanceOf(address(this));
        uint256 sInkhBalance = sinkh.balanceOf(address(this));
        assertEq(inkhBalance, 0);
        assertEq(sInkhBalance, initialInkhBalance);

        // Unstake sINKH
        sinkh.approve(address(staking), sInkhBalance);
        staking.unstake(address(this), sInkhBalance, triggerRebase, isSinkh);

        // Validate Balances post unstake
        inkhBalance = inkh.balanceOf(address(this));
        sInkhBalance = sinkh.balanceOf(address(this));
        assertEq(inkhBalance, initialInkhBalance);
        assertEq(sInkhBalance, 0);
    }

    function testUnstakeAtRebase() public {
        bool triggerRebase = true;
        bool isSinkh = true;
        bool claim = true;

        // Stake the inkh
        uint256 initialInkhBalance = inkh.balanceOf(address(this));
        inkh.approve(address(staking), initialInkhBalance);
        uint256 amountStaked = staking.stake(address(this), initialInkhBalance, isSinkh, claim);
        assertEq(amountStaked, initialInkhBalance);

        // Move into next rebase window
        hevm.warp(EPOCH_LENGTH);

        // Validate balances post stake
        // Post initial rebase, distribution amount is 0, so sINKH balance doens't change.
        uint256 inkhBalance = inkh.balanceOf(address(this));
        uint256 sInkhBalance = sinkh.balanceOf(address(this));
        assertEq(inkhBalance, 0);
        assertEq(sInkhBalance, initialInkhBalance);

        // Unstake sINKH
        sinkh.approve(address(staking), sInkhBalance);
        staking.unstake(address(this), sInkhBalance, triggerRebase, isSinkh);

        // Validate balances post unstake
        inkhBalance = inkh.balanceOf(address(this));
        sInkhBalance = sinkh.balanceOf(address(this));
        uint256 expectedAmount = initialInkhBalance.add(BOUNTY); // Rebase earns a bounty
        assertEq(inkhBalance, expectedAmount);
        assertEq(sInkhBalance, 0);
    }

    function testUnstakeAtRebaseFromGinkh() public {
        bool triggerRebase = true;
        bool isSinkh = false;
        bool claim = true;

        // Stake the inkh
        uint256 initialInkhBalance = inkh.balanceOf(address(this));
        inkh.approve(address(staking), initialInkhBalance);
        uint256 amountStaked = staking.stake(address(this), initialInkhBalance, isSinkh, claim);
        uint256 ginkhAmount = ginkh.balanceTo(initialInkhBalance);
        assertEq(amountStaked, ginkhAmount);

        // test the unstake
        // Move into next rebase window
        hevm.warp(EPOCH_LENGTH);

        // Validate balances post-stake
        uint256 inkhBalance = inkh.balanceOf(address(this));
        uint256 ginkhBalance = ginkh.balanceOf(address(this));
        assertEq(inkhBalance, 0);
        assertEq(ginkhBalance, ginkhAmount);

        // Unstake gINKH
        ginkh.approve(address(staking), ginkhBalance);
        staking.unstake(address(this), ginkhBalance, triggerRebase, isSinkh);

        // Validate balances post unstake
        inkhBalance = inkh.balanceOf(address(this));
        ginkhBalance = ginkh.balanceOf(address(this));
        uint256 expectedInkh = initialInkhBalance.add(BOUNTY); // Rebase earns a bounty
        assertEq(inkhBalance, expectedInkh);
        assertEq(ginkhBalance, 0);
    }
}
