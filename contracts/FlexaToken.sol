pragma solidity ^0.4.21;

import "../zeppelin/contracts/token/ERC20/StandardToken.sol";
import "../zeppelin/contracts/ownership/Ownable.sol";


/**
 * @title The FlexaToken ERC20 Contract
 * @author Zachary Kilgore
 * @dev This contract is a standard ERC20 token.
 */
contract FlexaToken is StandardToken, Ownable {

  string public name = "BoCoin";
  string public symbol = "BOCN";
  uint8 public constant decimals = 18;
  uint256 public constant INITIAL_SUPPLY = 100000000000 * (10 ** uint256(decimals));


  /**
    * @dev FlexaToken contract constructor. Assigns all tokens to contract
    *      creator.
    */
  function FlexaToken() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }

}