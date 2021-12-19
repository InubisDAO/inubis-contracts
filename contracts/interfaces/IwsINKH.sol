// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.7.5;

import "./IERC20.sol";

// Old wsINKH interface
interface IwsINKH is IERC20 {
    function wrap(uint256 _amount) external returns (uint256);

    function unwrap(uint256 _amount) external returns (uint256);

    function wINKHTosINKH(uint256 _amount) external view returns (uint256);

    function sINKHTowINKH(uint256 _amount) external view returns (uint256);
}
