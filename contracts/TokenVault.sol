pragma solidity ^0.4.21;

import "./ownership/Recoverable.sol";
import "./token/ERC20Basic.sol";
import "./token/SafeERC20.sol";
import "./math/SafeMath.sol";

/**
 * @title TokenVault Smart Contract
 * @dev Contract to handle token distribution and lockup.
 *
 * Contract is Recoverable, which also means it is Ownable
 */
contract TokenVault is Recoverable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20Basic;

    event Locked();
    event Unlocked();

    // token address
    address public token;

    /**
     * tokensToBeAllocated should be set on initialization with the amount of
     * tokens that should be allocated prior to releasing the tokens.
     */
    uint256 public tokensToBeAllocated;
    uint256 public tokensAllocated;

    // is the contract loaded or locked
    bool public isLoaded;
    bool public isLocked;

    // Mapping of accounts to token allocations
    mapping (address => uint256) private allocations;
    // Mapping of accounts to token balances
    mapping (address => uint256) private bonuses;


    /**
     * @dev Creates a TokenVault contract that stores FlexaToken distribution and
     *      bonus allocations and lockup.
     */
    function TokenVault(ERC20Basic _token) public {
        require(_token != address(0));

        token = _token;
    }

    /**
     * @dev Function to set allocations for accounts. To be called by owner,
     *      most likely by a script.
     * @param _to The address to allocate token amount and bonus amount for.
     */
    function setAllocation(address _to, uint256 _value, uint256 _bonus) external returns(bool);


    /**
     * @dev Claim can be called by an account to claim whatever tokens for an
     *      account are ready to be claimed.
     */
    function claim() public returns (bool);

}