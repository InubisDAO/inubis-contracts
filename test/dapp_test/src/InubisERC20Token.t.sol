// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "ds-test/test.sol"; // ds-test
import "../../../contracts/InubisERC20.sol";

import "../../../contracts/InubisAuthority.sol";

contract InubisERC20TokenTest is DSTest {
    InubisERC20Token internal inkhContract;

    IInubisAuthority internal authority;

    address internal UNAUTHORIZED_USER = address(0x1);

    function test_erc20() public {
        authority = new InubisAuthority(address(this), address(this), address(this), address(this));
        inkhContract = new InubisERC20Token(address(authority));
        assertEq("Inubis", inkhContract.name());
        assertEq("INKH", inkhContract.symbol());
        assertEq(9, int256(inkhContract.decimals()));
    }

    function testCannot_mint() public {
        authority = new InubisAuthority(address(this), address(this), address(this), UNAUTHORIZED_USER);
        inkhContract = new InubisERC20Token(address(authority));
        // try/catch block pattern copied from https://github.com/Anish-Agnihotri/MultiRaffle/blob/master/src/test/utils/DSTestExtended.sol
        try inkhContract.mint(address(this), 100) {
            fail();
        } catch Error(string memory error) {
            // Assert revert error matches expected message
            assertEq("UNAUTHORIZED", error);
        }
    }

    // Tester will pass it's own parameters, see https://fv.ethereum.org/2020/12/11/symbolic-execution-with-ds-test/
    function test_mint(uint256 amount) public {
        authority = new InubisAuthority(address(this), address(this), address(this), address(this));
        inkhContract = new InubisERC20Token(address(authority));
        uint256 supplyBefore = inkhContract.totalSupply();
        // TODO look into https://dapphub.chat/channel/dev?msg=HWrPJqxp8BHMiKTbo
        // inkhContract.setVault(address(this)); //TODO WTF msg.sender doesn't propigate from .dapprc $DAPP_TEST_CALLER config via mint() call, must use this value
        inkhContract.mint(address(this), amount);
        assertEq(supplyBefore + amount, inkhContract.totalSupply());
    }

    // Tester will pass it's own parameters, see https://fv.ethereum.org/2020/12/11/symbolic-execution-with-ds-test/
    function test_burn(uint256 mintAmount, uint256 burnAmount) public {
        authority = new InubisAuthority(address(this), address(this), address(this), address(this));
        inkhContract = new InubisERC20Token(address(authority));
        uint256 supplyBefore = inkhContract.totalSupply();
        // inkhContract.setVault(address(this));  //TODO WTF msg.sender doesn't propigate from .dapprc $DAPP_TEST_CALLER config via mint() call, must use this value
        inkhContract.mint(address(this), mintAmount);
        if (burnAmount <= mintAmount) {
            inkhContract.burn(burnAmount);
            assertEq(supplyBefore + mintAmount - burnAmount, inkhContract.totalSupply());
        } else {
            try inkhContract.burn(burnAmount) {
                fail();
            } catch Error(string memory error) {
                // Assert revert error matches expected message
                assertEq("ERC20: burn amount exceeds balance", error);
            }
        }
    }
}
