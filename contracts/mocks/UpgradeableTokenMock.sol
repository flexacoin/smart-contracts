pragma solidity 0.4.21;

import "../UpgradeableToken.sol";

/**
 * @title Mock implementation of an UpgradeAgent for testing
 */
contract UpgradeableTokenMock is UpgradeableToken {

  /**
   * @dev Constructor of a mock UpgradeableToken.
   * @param _totalSupply Amount of total supply the original token should have
   */
  function UpgradeableTokenMock(
    address _upgradeMaster,
    uint256 _totalSupply
  )
    public
    UpgradeableToken(_upgradeMaster)
  {
    totalSupply_ = _totalSupply;
  }

}