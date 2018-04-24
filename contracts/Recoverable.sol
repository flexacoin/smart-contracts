pragma solidity ^0.4.21;

import "../zeppelin/contracts/ownership/CanReclaimToken.sol";
import "../zeppelin/contracts/ownership/Claimable.sol";


/**
 * @title Recoverable is a contract to ensure ether and tokens can be recovered
 * by the owner of a contract.
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev This will prevent any accidental loss of tokens and ether.
 */
contract Recoverable is CanReclaimToken, Claimable {
  using SafeERC20 for ERC20Basic;

  /**
   * @dev Transfer all Ether held by the contract to the owner.
   */
  function reclaimEther() external onlyOwner {
    owner.transfer(address(this).balance);
  }

}