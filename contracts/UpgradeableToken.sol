/**
 * This contract is based on the TokenMarketNet's UpgradeableToken contract. That
 * contract has been modified to work outside of that ecosystem.
 */
pragma solidity ^0.4.21;

import "../zeppelin/contracts/token/ERC20/StandardToken.sol";
import "./tokenmarket/UpgradeAgent.sol";

/**
 * @title A token upgrade mechanism where users can opt-in amount of tokens to
 * the next smart contract revision.
 * @dev First envisioned by Golem and Lunyr projects.
 */
contract UpgradeableToken is StandardToken {

  /**
   * Contract / person who can set the upgrade path. Similar to owner in Ownable
   * contracts
   */
  address public upgradeMaster;

  /** The next contract where the tokens will be migrated. */
  UpgradeAgent public upgradeAgent;

  /** How many tokens have been upgraded. */
  uint256 public totalUpgraded = 0;

  /**
   * Upgrade states.
   *
   * - NotAllowed: The child contract has not reached a condition where the upgrade can bgun
   * - WaitingForAgent: Token allows upgrade, but we don't have a new agent yet
   * - ReadyToUpgrade: The agent is set, but not a single token has been upgraded yet
   * - Upgrading: Upgrade agent is set and the balance holders can upgrade their tokens
   */
  enum UpgradeState {Unknown, NotAllowed, WaitingForAgent, ReadyToUpgrade, Upgrading}


  /**
   * Somebody has upgraded some of his tokens.
   */
  event Upgrade(address indexed from, address indexed to, uint256 value);

  /**
   * New upgrade agent available.
   */
  event UpgradeAgentSet(address agent);


  /** Must be called by current upgradeMaster */
  modifier onlyUpgradeMaster() {
    require(msg.sender == upgradeMaster);
    _;
  }


  /**
   * @notice UpgradeableToken constructor. Do not allow construction without
   * upgrade master set.
   * @param _upgradeMaster Address of the upgrade master
   */
  function UpgradeableToken(address _upgradeMaster) public {
    require(_upgradeMaster != address(0));
    upgradeMaster = _upgradeMaster;
  }

  /**
   * @notice Allow the token holder to upgrade some of their tokens to a new contract.
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

    // Upgrade agent reissues the tokens
    upgradeAgent.upgradeFrom(msg.sender, _value);

    emit Upgrade(msg.sender, upgradeAgent, _value);
  }

  /**
   * @notice Change the upgrade master.
   * @dev This allows us to set a new owner for the upgrade mechanism.
   * @param _upgradeMaster The address to change the upgrade master to
   */
  function setUpgradeMaster(address _upgradeMaster) external onlyUpgradeMaster {
    require(_upgradeMaster != address(0));
    upgradeMaster = _upgradeMaster;
  }

  /**
   * @notice Set an upgrade agent contract to process the upgrade
   * @dev The _upgradeAgent contract address must satisfy the UpgradeAgent
   * interface
   * @param _upgradeAgent The address of the new UpgradeAgent smart contract
   */
  function setUpgradeAgent(address _upgradeAgent) external onlyUpgradeMaster {
    require(canUpgrade()); // Ensure the token is upgradeable in the first place
    require(_upgradeAgent != address(0)); // Ensure
    require(getUpgradeState() != UpgradeState.Upgrading); // Ensure upgrade has not started

    upgradeAgent = UpgradeAgent(_upgradeAgent);

    // New upgradeAgent must be UpgradeAgent
    require(upgradeAgent.isUpgradeAgent());
    // Make sure that token supplies match in source and target
    require(upgradeAgent.originalSupply() != totalSupply_);

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
   * Child contract can enable to provide the condition when the upgrade can begun.
   */
  function canUpgrade() public view returns(bool) {
    return true;
  }

}