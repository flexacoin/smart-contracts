pragma solidity ^0.4.21;

import "../zeppelin/contracts/token/ERC20/PausableToken.sol";
import "./UpgradeableToken.sol";
import "./Recoverable.sol";


/**
 * @title The Flexacoin ERC20 Compliant Token Contract
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev Flexacoin is a standard ERC20 token that has the additional capabilities:
 *
 * - Claimable: Owned contract where the transfer of ownership must be claimed
 * by the new owner prior to the old owner being removed.
 * - Recoverable: Owned contract that allows the owner to recover ether and tokens
 * sent to the contract in error that would otherwise be trapped.
 * - Pauseable: Owned contract that allows the ERC20 functionality (transfer,
 * approval, etc) to be paused and unpaused by the owner in case of emergency.
 * - Upgradeable: Allows for the token to be upgraded to a new contract.
 */
contract Flexacoin is PausableToken, UpgradeableToken, Recoverable {

  string public constant name = "Flexacoin";
  string public constant symbol = "FXC";
  uint8 public constant decimals = 18;
  uint256 INITIAL_SUPPLY = 100000000000 * (10 ** uint256(decimals));


  /**
    * @dev Flexacoin contract constructor. Assigns all tokens to contract
    * creator.
    */
  function Flexacoin() public UpgradeableToken(msg.sender) {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }

  /**
   * @dev Allow upgrade agent functionality only if functionality is not paused
   */
  function canUpgrade() public view returns(bool) {
    return !paused && super.canUpgrade();
  }

}