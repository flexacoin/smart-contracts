pragma solidity 0.4.21;

import "../tokenmarket/UpgradeAgent.sol";

/**
 * @title Mock implementation of an UpgradeAgent for testing.
 */
contract UpgradeAgentMock is UpgradeAgent {

  mapping (address => uint256) public newBalances;

  /**
   * @dev Constructor so one can set the original supply correctly.
   * @param _originalSupply Amount of total supply the original token had
   */
  function UpgradeAgentMock(uint256 _originalSupply) public {
    originalSupply = _originalSupply;
  }

  /**
   * @dev Basic implementation of the upgradeFrom function.
   */
  function upgradeFrom(address _from, uint256 _value) public {
    newBalances[_from] = _value;
  }

}