pragma solidity ^0.4.12;

import "../zeppelin/contracts/ownership/Claimable.sol";
import "../zeppelin/contracts/token/ERC20/ERC20Basic.sol";
import "../zeppelin/contracts/token/ERC20/SafeERC20.sol";


contract Recoverable is Claimable {
  using SafeERC20 for ERC20Basic;

  /**
    * @dev Recover all ERC20Basic compatible tokens
    * @param token ERC20Basic The address of the token contract
    */
  function recoverToken(ERC20Basic token) external onlyOwner {
    uint256 balance = token.balanceOf(this);
    token.safeTransfer(owner, balance);
  }

  /**
    * @dev Interface function, can be overwritten by the superclass
    * @param token Token which balance we will check and return
    * @return The amount of tokens (in smallest denominator) the contract owns
    */
  function tokensToBeReturned(ERC20Basic token) public view returns (uint) {
    return token.balanceOf(this);
  }

}