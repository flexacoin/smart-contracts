pragma solidity ^0.4.21;

import "./Recoverable.sol";
import "../zeppelin/contracts/token/ERC20/PausableToken.sol";


/**
 * @title The Flexacoin ERC20 Compliant Token Contract
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev Flexacoin is a standard ERC20 token that inherits the
 */
contract Flexacoin is PausableToken, Recoverable {
  string public constant name = "Flexacoin";
  string public constant symbol = "FXC";
  uint8 public constant decimals = 18;
  uint256 INITIAL_SUPPLY = 100000000000 * (10 ** uint256(decimals));


  /**
    * @dev Flexacoin contract constructor. Assigns all tokens to contract
    * creator.
    */
  function Flexacoin() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }

}