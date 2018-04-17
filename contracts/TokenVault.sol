pragma solidity ^0.4.21;

// import "./Recoverable.sol";
import "../zeppelin/contracts/ownership/Claimable.sol";
import "../zeppelin/contracts/ownership/CanReclaimToken.sol";
import "../zeppelin/contracts/token/ERC20/ERC20Basic.sol";
import "../zeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../zeppelin/contracts/math/SafeMath.sol";

/*

TODO
----
* Ensure contract can reclaim any sent ETH as well
* * Create an inheritable version of that that involves all of the desired ownership properties
* Figure out if we want to just use two instances of vault contracts for different
  vesting periods (initial vs bonus)
*/



/**
 * @title TokenVault Smart Contract
 * @dev Contract to handle token distribution and lockup.
 *
 * TokenVault is Recoverable, which also means it is Ownable. (TODO - Claimable)
 */
contract TokenVault is CanReclaimToken, Claimable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20Basic;

  // The ERC20 token distribution being managed
  ERC20Basic public token;

  /**
   * totalTokensToBeAllocated should be set on initialization with the amount of
   * tokens that should be allocated prior to releasing the tokens.
   */
  uint256 public tokensToBeAllocated;

  // Bonuses like above
  uint256 public bonusesToBeAllocated;

  // tokensAllocated tracks the total amount of tokens allocated.
  uint256 public tokensAllocated;

  // bonusesllocated tracks the total amount of tokens allocated to bonuses.
  uint256 public bonusesAllocated;

  // Total amount of tokens claimed, including bonuses.
  uint256 public totalClaimed;

  // UNIX timestamp when the contract was finalized.
  uint256 public finalizedAt;

  // UNIX timestamp when the contract was unlocked.
  uint256 public unlockedAt;

  // bonusVestingTime is the amount of time (in milliseconds) to wait after
  // unlocking to allow bonuses to be claimed
  uint256 public constant bonusVestingTime = 1 * 24 * 60 * 60 * 1000;

  // Mapping of accounts to token allocations
  mapping (address => uint256) private tokenBalances;

  // Mapping of accounts to bonus allocations
  mapping (address => uint256) private bonusBalances;

  // @TODO Mapping of tokens claimed by a beneficiary
  mapping (address => uint256) private tokensClaimed;

  // Event to track all allocations are set and vault is ready to be unlocked.
  event Finalized();

  // Event to track when vault is unlocked and tokens may be claimed.
  event Unlocked();

  /**
   * Event to track successful allocation of amount and bonus amount.
   * @param beneficiary Account that allocation is for
   * @param value Amount of tokens allocated
   * @param bonusValue Amount of bonus tokens allocated
   */
  event Allocated(address indexed beneficiary, uint256 value, uint256 bonusValue);

  /**
   * Event to track a beneficiary receiving an allotment of tokens
   * @param beneficiary Account that received tokens
   * @param value Amount of tokens received
   */
  event Distributed(address indexed beneficiary, uint256 value);

  // Must not have been finalized or unlocked in order to be loading
  modifier vaultNotFinalized() {
    require(finalizedAt == 0);
    require(unlockedAt == 0);
    _;
  }

  // Ensure the vault has been finalized
  modifier vaultFinalized() {
    require(finalizedAt > 0);
    _;
  }

  // Ensure the vault is unlocked
  modifier vaultUnlocked() {
    require(unlockedAt > 0);
    _;
  }


  /**
   * @dev Creates a TokenVault contract that stores the token distribution, including
   *      bonus allocations.
   */
  function TokenVault(
    ERC20Basic _token,
    uint256 _tokensToBeAllocated,
    uint256 _bonusesToBeAllocated
  )
    public
  {
    require(address(_token) != address(0));
    require(_tokensToBeAllocated > 0);
    require(_bonusesToBeAllocated > 0);

    token = _token;
    tokensToBeAllocated = _tokensToBeAllocated;
    bonusesToBeAllocated = _bonusesToBeAllocated;
  }

  /**
   * @notice Finalize setting of allocations and bonuses
   * @return true if the vault has been finalized, false if not
   */
  function finalize() public onlyOwner vaultNotFinalized returns(bool success) {
    // Ensure we have allocated all we expected
    require(tokensAllocated == tokensToBeAllocated);
    require(bonusesAllocated == bonusesToBeAllocated);

    // Ensure vault has required balance of tokens to distribute. Needs to have
    // enough for the bonus as well.
    uint256 total = tokensAllocated;
    total.add(bonusesAllocated);
    require(token.balanceOf(address(this)) == total);

    finalizedAt = now;

    emit Finalized();

    success = true;
  }

  /**
   * @dev Function to set allocations for accounts. To be called by owner,
   *      likely in a scripted fashion.
   * @param _beneficiary The address to allocate token amount and bonus amount for
   * @param _amount The amount of tokens to be allocated and made available
   *         immediately on unlock
   * @param _bonusAmount The amount of tokens to be allocated and made available
   *        once bonuses have vested
   * @return true if allocation and bonus have been set for beneficiary, false
   *         if unable to.
   */
  function setAllocationAndBonus(
    address _beneficiary,
    uint256 _amount,
    uint256 _bonusAmount
  )
    external
    onlyOwner
    vaultNotFinalized
    returns(bool success)
  {
    require(_beneficiary != address(0)); // Ensure we've set the beneficiary
    require(_amount != 0); // Ensure we have non zero amount

    // Setting an allocation should
    // * Add _amount to tokensAllocated
    // * Add _amount to tokenBalances for _beneficiary
    // * Add _bonusAmount to bonusesAllocated
    // * Add _bonusAmount to bonusBalances for _beneficiary
    tokenBalances[_beneficiary].add(_amount);
    tokensAllocated.add(_amount);

    if (_bonusAmount > 0) {
      bonusBalances[_beneficiary].add(_bonusAmount);
      bonusesAllocated.add(_bonusAmount);
    }

    emit Allocated(_beneficiary, _amount, _bonusAmount);
    success = true;
  }

  /**
   * @notice Unlock the tokens in the vault and allow tokens to be claimed by
   *         their owners.
   * @dev Must be finalized prior to unlocking
   * @return true if executed, false if not
   */
  function unlock() public onlyOwner vaultFinalized returns(bool success) {
    unlockedAt = now;
    emit Unlocked();
    success = true;
  }

  /**
   * @notice Claim whatever tokens account are available to be claimed by the caller.
   * @dev Can be called when contract has been unlocked.
   * @return true if balance successfully distribute to sender, false otherwise.
   */
  function claim() public vaultUnlocked returns(bool success) {
    address beneficiary = msg.sender;
    require(tokenBalances[beneficiary] > 0);

    uint256 amount = tokenBalances[beneficiary];
    tokenBalances[beneficiary] = 0; // Zero out token balance for beneficiary

    require(_transferTokens(beneficiary, amount));
    success = true;
  }

  /**
   * @notice claimBonus is used to claim an unlocked bonus allotment
   * @dev TODO
   */
  // function claimBonus() public vaultUnlocked returns (bool) {
  //   // Bonuses are available after the vault has been unlocked and enough vesting
  //   // time has completed
  //   require(unlockedAt + bonusVestingTime > now);

  //   // Not implemented\
  //   require(false);

  //   return false;
  // }

  /**
   * @notice Utility function to actually transfer allocated tokens to their
             owners.
   * @dev Can only be called by the owner. To be used in case an investor would
   *      like their tokens transferred directly. Useful for scripting.
   * @param _beneficiary Account to transfer tokens to. The amount is derived from
            the claimable amount in the vault.
   */
  function transfer(address _beneficiary) public onlyOwner vaultUnlocked returns(bool success) {
    require(tokenBalances[_beneficiary] > 0);

    uint256 amount = tokenBalances[_beneficiary];
    tokenBalances[_beneficiary] = 0; // Zero out token balance for beneficiary

    require(_transferTokens(_beneficiary, amount));
    success = true;
  }

  /***************
      Internal
  ****************/

  /**
   * @dev Internal function to transfer an amount of tokens to a beneficiary.
   * @return true if tokens transferred successfully, false if not.
   */
  function _transferTokens(address _beneficiary, uint256 _amount) internal returns(bool success) {
    // Update the claimed trackers
    tokensClaimed[_beneficiary].add(_amount);
    totalClaimed.add(_amount);

    token.safeTransfer(_beneficiary, _amount);

    emit Distributed(_beneficiary, _amount);
    return true;
  }

}