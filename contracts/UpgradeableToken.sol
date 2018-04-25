/**
 * This contract is based on the TokenMarketNet's UpgradeableToken contract found
 * here: https://github.com/TokenMarketNet/ico/blob/master/contracts/UpgradeableToken.sol.
 * The contract has been minimally modified to work outside of that ecosystem,
 * and refactored for consistency and style.
 */
pragma solidity 0.4.21;

import "../zeppelin/contracts/token/ERC20/StandardToken.sol";
import "./tokenmarket/UpgradeAgent.sol";

/**
 * @title UpgradeableToken provides a token upgrade mechanism that, after
 * adequete preparation, allows token owners to opt-in to a new upgraded token.
 * @notice To upgrade the token, upgrade master (owner) sets the upgradeAgent
 * contract. This upgradeAgent must satisfy the UpgradeAgent interface, meaning
 * it has a method `upgradeFrom` that is responsible for creating new tokens for
 * a user. Once the agent is set, the token holders upgrade their tokens
 * through this contracts `upgrade` method.
 * @author Zachary Kilgore @ Flexa Technologies LLC
 * @dev First envisioned by Golem and Lunyr projects
 */
contract UpgradeableToken is StandardToken {

  /**
   * Contract/person who can set the upgrade agent. Similar to `owner` in Ownable
   * contracts.
   */
  address public upgradeMaster;

  /** The contract that will handle the upgrading the tokens. */
  UpgradeAgent public upgradeAgent;

  /** How many tokens have been upgraded. */
  uint256 public totalUpgraded = 0;

  /**
   * Upgrade states.
   *
   * - `Unknown`: Zero state to prevent erroneous state reporting. Should never be returned
   * - `NotAllowed`: The child contract has not reached a condition where the upgrade can begin
   * - `WaitingForAgent`: Allowed to upgrade, but agent has not been set
   * - `ReadyToUpgrade`: The agent is set, but no tokens has been upgraded yet
   * - `Upgrading`: Upgrade agent is set, and balance holders are upgrading their tokens
   */
  enum UpgradeState {Unknown, NotAllowed, WaitingForAgent, ReadyToUpgrade, Upgrading}


  /**
   * Event to track that a token holder has upgraded some of their tokens.
   * @param from Address of the token holder
   * @param to Address of the upgrade agent
   * @param value Number of tokens upgraded
   */
  event Upgrade(address indexed from, address indexed to, uint256 value);

  /**
   * Event to signal that an upgrade agent contract has been set.
   * @param upgradeAgent Address of the new upgrade agent
   */
  event UpgradeAgentSet(address upgradeAgent);


  /** Ensure function is called by current upgrade master. */
  modifier onlyUpgradeMaster() {
    require(msg.sender == upgradeMaster);
    _;
  }


  /**
   * @notice UpgradeableToken contract constructor function.
   * @dev Do not allow construction without upgrade master set.
   * @param _upgradeMaster Address of the upgrade master
   */
  function UpgradeableToken(address _upgradeMaster) public {
    require(_upgradeMaster != address(0));
    upgradeMaster = _upgradeMaster;
  }

  /**
   * @notice Allow the token holder to upgrade some of their tokens to the new
   * contract.
   * @param _value The amount of tokens to upgrade
   */
  function upgrade(uint256 _value) public {
    UpgradeState state = getUpgradeState();
    require(state == UpgradeState.ReadyToUpgrade || state == UpgradeState.Upgrading);
    require(_value > 0);

    // Take tokens out of circulation
    balances[msg.sender] = balances[msg.sender].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);

    totalUpgraded = totalUpgraded.add(_value);

    // Hand control to upgrade agent to process new tokens for the sender
    upgradeAgent.upgradeFrom(msg.sender, _value);

    emit Upgrade(msg.sender, upgradeAgent, _value);
  }

  /**
   * @notice Change the upgrade master.
   * @dev This allows us to set a new upgrade master (owner).
   * @param _upgradeMaster The address to change the upgrade master to
   */
  function setUpgradeMaster(address _upgradeMaster) external onlyUpgradeMaster {
    require(_upgradeMaster != address(0));
    upgradeMaster = _upgradeMaster;
  }

  /**
   * @notice Set an upgrade agent contract to process the upgrade.
   * @dev The _upgradeAgent contract address must satisfy the UpgradeAgent
   * interface.
   * @param _upgradeAgent The address of the new UpgradeAgent smart contract
   */
  function setUpgradeAgent(address _upgradeAgent) external onlyUpgradeMaster {
    require(canUpgrade()); // Ensure the token is upgradeable in the first place
    require(_upgradeAgent != address(0)); // Ensure address is not zero address
    require(getUpgradeState() != UpgradeState.Upgrading); // Ensure upgrade has not started

    upgradeAgent = UpgradeAgent(_upgradeAgent);

    // New upgradeAgent must be UpgradeAgent
    require(upgradeAgent.isUpgradeAgent());
    // Make sure that token supplies match in source and target token contracts
    require(upgradeAgent.originalSupply() == totalSupply_);

    emit UpgradeAgentSet(upgradeAgent);
  }

  /**
   * @notice Get the state of the token upgrade.
   */
  function getUpgradeState() public view returns(UpgradeState) {
    if(!canUpgrade()) return UpgradeState.NotAllowed;
    else if(address(upgradeAgent) == address(0)) return UpgradeState.WaitingForAgent;
    else if(totalUpgraded == 0) return UpgradeState.ReadyToUpgrade;
    else return UpgradeState.Upgrading;
  }

  /**
   * @dev Child contract can enable to provide the condition when the upgrade
   * can begin.
   */
  function canUpgrade() public view returns(bool) {
    return true;
  }

}