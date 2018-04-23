pragma solidity 0.4.21;

import "./Recoverable.sol";
import "../zeppelin/contracts/token/ERC20/ERC20Basic.sol";
import "../zeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../zeppelin/contracts/math/SafeMath.sol";


/**
 * @title TokenVault Smart Contract
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev Contract to handle token distribution and lockup.
 * TokenVault is Recoverable, which also means it is Ownable and the owner can
 * reclaim any errant tokens or ether that is sent to the contract.
 */
contract TokenVault is Recoverable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20Basic;

  /** The ERC20 token distribution being managed. */
  ERC20Basic public token;

  /** The amount of tokens that should be allocated prior to locking the vault. */
  uint256 public tokensToBeAllocated;

  /** The total amount of tokens allocated */
  uint256 public tokensAllocated;

  /** Total amount of tokens claimed, including bonuses. */
  uint256 public totalClaimed;

  /** UNIX timestamp when the contract was locked. */
  uint256 public lockedAt;

  /** UNIX timestamp when the contract was unlocked. */
  uint256 public unlockedAt;

  /**
   * vestingPeriod is the amount of time (in milliseconds) to wait after
   * unlocking to allow allocations to be claimed
   */
  uint256 public vestingPeriod = 0;

  /** Mapping of accounts to token allocations */
  mapping (address => uint256) public allocations;

  /** Mapping of tokens claimed by a beneficiary */
  mapping (address => uint256) public claimed;


  /** Event to track that allocations have been set. */
  event Locked();

  /** Event to track when the allocations are available to be claimed. */
  event Unlocked();

  /**
   * Event to track successful allocation of amount and bonus amount.
   * @param beneficiary Account that allocation is for
   * @param amount Amount of tokens allocated
   */
  event Allocated(address indexed beneficiary, uint256 amount);

  /**
   * Event to track a beneficiary receiving an allotment of tokens
   * @param beneficiary Account that received tokens
   * @param amount Amount of tokens received
   */
  event Distributed(address indexed beneficiary, uint256 amount);


  // Must not have been finalized or unlocked in order to be loading
  modifier vaultLoading() {
    require(lockedAt == 0);
    _;
  }

  // Ensure the vault has been locked
  modifier vaultLocked() {
    require(lockedAt > 0);
    _;
  }

  // Ensure the vault has been unlocked
  modifier vaultUnlocked() {
    require(unlockedAt > 0);
    _;
  }


  /**
   * @dev Creates a TokenVault contract that stores a token distribution
   * @param _token The address of the ERC20 token the Vault is for
   * @param _tokensToBeAllocated The amount of tokens that will be allocated
   * prior to locking
   * @param _vestingPeriod The amount of time, in seconds, that must pass
   * after locking in the allocations and then unlocking the allocations for
   * claiming
   */
  function TokenVault(
    ERC20Basic _token,
    uint256 _tokensToBeAllocated,
    uint256 _vestingPeriod
  )
    public
  {
    require(address(_token) != address(0));
    require(_tokensToBeAllocated > 0);

    token = _token;
    tokensToBeAllocated = _tokensToBeAllocated;
    vestingPeriod = _vestingPeriod;
  }

  /**
   * @dev Function to set allocations for accounts. To be called by owner,
   * likely in a scripted fashion.
   * @param _beneficiary The address to allocate tokens for
   * @param _amount The amount of tokens to be allocated and made available
   * once unlocked
   * @return true if allocation has been set for beneficiary, false if not
   */
  function setAllocation(
    address _beneficiary,
    uint256 _amount
  )
    external
    onlyOwner
    vaultLoading
    returns(bool success)
  {
    require(_beneficiary != address(0)); // Ensure we've set the beneficiary
    require(_amount != 0); // Ensure we have non zero amount
    require(allocations[_beneficiary] == 0); // Ensure that we haven't yet set for this address

    // Update the storage
    allocations[_beneficiary] = allocations[_beneficiary].add(_amount);
    tokensAllocated = tokensAllocated.add(_amount);

    emit Allocated(_beneficiary, _amount);

    success = true;
  }

  /**
   * @notice Finalize setting of allocations and begin the lock up period.
   * @dev Should be called after all allocations have been recorded.
   * @return true if the vault has been successfully locked, false if it has not
   */
  function lock() public onlyOwner vaultLoading returns(bool success) {
    // Ensure we have allocated all we expected to
    require(tokensAllocated == tokensToBeAllocated);
    // Ensure vault has required balance of tokens to distribute. Needs to have
    // enough for the bonus as well.
    require(token.balanceOf(address(this)) == tokensAllocated);

    // solium-disable-next-line security/no-block-members
    lockedAt = block.timestamp;

    emit Locked();

    success = true;
  }

  // event Print(uint256 lockedAt, uint256 added, uint256 ts);


  /**
   * @notice Unlock the tokens in the vault and allow tokens to be claimed by
   * their owners.
   * @dev Must be locked prior to unlocking. Also, the vestingPeriod must be up.
   * @return true if executed, false if not
   */
  function unlock() public onlyOwner vaultLocked returns(bool success) {
    require(unlockedAt == 0); // Can only unlock once
    // solium-disable-next-line security/no-block-members
    require(block.timestamp >= lockedAt.add(vestingPeriod)); // Lock up must be over

    // solium-disable-next-line security/no-block-members
    unlockedAt = block.timestamp;

    emit Unlocked();

    success = true;
  }

  /**
   * @notice Claim whatever tokens account are available to be claimed by the caller.
   * @dev Can only be called once contract has been unlocked.
   * @return true if balance successfully distribute to sender, false otherwise.
   */
  function claim() public vaultUnlocked returns(bool success) {
    return _transferTokens(msg.sender);
  }

  /**
   * @notice Utility function to actually transfer allocated tokens to their
   * owners.
   * @dev Can only be called by the owner. To be used in case an investor would
   * like their tokens transferred directly for them. Should be scripted.
   * @param _beneficiary Account to transfer tokens to
   */
  function transferFor(
    address _beneficiary
  )
    public
    onlyOwner
    vaultUnlocked
    returns(bool success)
  {
    return _transferTokens(_beneficiary);
  }

  /***************
      Private
  ****************/

  /**
   * @dev Calculate the number of tokens a beneficiary can claim
   * @return The amount of tokens available to be claimed
   */
  function _claimableTokens(address _beneficiary) private view returns(uint256 amount) {
    return allocations[_beneficiary].sub(claimed[_beneficiary]);
  }

  /**
   * @dev Internal function to transfer an amount of tokens to a beneficiary
   * @param _beneficiary Account to transfer tokens to. The amount is derived from
   * the claimable amount in the vault.
   * @return true if tokens transferred successfully, false if not.
   */
  function _transferTokens(address _beneficiary) private returns(bool success) {
    uint256 _amount = _claimableTokens(_beneficiary);
    require(_amount > 0);

    claimed[_beneficiary] = claimed[_beneficiary].add(_amount);
    totalClaimed = totalClaimed.add(_amount);

    token.safeTransfer(_beneficiary, _amount);

    emit Distributed(_beneficiary, _amount);

    success = true;
  }

}