pragma solidity 0.4.21;

import "../UpgradeableToken.sol";

/**
 * @title Mock implementation of an UpgradeableToken (for testing).
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
    balances[msg.sender] = _totalSupply;
    emit Transfer(0x0, msg.sender, _totalSupply);
  }

}