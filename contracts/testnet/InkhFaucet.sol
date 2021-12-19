// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.7.5;

import "../interfaces/IERC20.sol";
import "../types/Ownable.sol";

contract InkhFaucet is Ownable {
    IERC20 public inkh;

    constructor(address _inkh) {
        inkh = IERC20(_inkh);
    }

    function setInkh(address _inkh) external onlyOwner {
        inkh = IERC20(_inkh);
    }

    function dispense() external {
        inkh.transfer(msg.sender, 1e9);
    }
}
