pragma solidity ^0.4.21;

import "../zeppelin/contracts/ownership/CanReclaimToken.sol";
import "../zeppelin/contracts/ownership/Claimable.sol";


/**
 * @title Recoverable ensures ether and ERC20 tokens can be claimed by the
 * owner of the contract.
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev Prevents accidental loss of tokens and ether erroneously sent to
 * this contract
 */
contract Recoverable is CanReclaimToken, Claimable {
  using SafeERC20 for ERC20Basic;

  /**
   * @dev Transfer all ether held by the contract to the contract owner.
   */
  function reclaimEther() external onlyOwner {
    owner.transfer(address(this).balance);
  }

}