pragma solidity 0.4.23;

import "../zeppelin/contracts/token/ERC20/PausableToken.sol";
import "./UpgradeableToken.sol";
import "./Recoverable.sol";


/**
 * @title Flexacoin ERC20 Compliant Token Contract
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev Flexacoin is a standard ERC20 token that has the following additional
 * properties:
 *
 * - Upgradeable: Allows for the token to be upgraded to a new contract.
 * - Claimable: Owned contract where the transfer of ownership must be claimed
 * by the new owner prior to the old owner being removed.
 * - Recoverable: Owned contract that allows the owner to recover ether and tokens
 * sent to the contract in error that would otherwise be trapped.
 * - Pauseable: Owned contract that allows the ERC20 functionality (transfer,
 * approval, etc) to be paused and unpaused by the owner in case of emergency.
 */
contract Flexacoin is PausableToken, UpgradeableToken {

  string public constant name = "Flexacoin";
  string public constant symbol = "FXC";
  uint8 public constant decimals = 18;

  uint256 public constant INITIAL_SUPPLY = 100000000000 * (10 ** uint256(decimals));


  /**
    * @notice Flexacoin (ERC20 Token) contract constructor.
    * @dev Assigns all tokens to contract creator.
    */
  constructor() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }

  /**
   * @dev Allow UpgradeableToken functionality only if contract is not paused.
   */
  function canUpgrade() public view returns(bool) {
    return !paused;
  }

}
