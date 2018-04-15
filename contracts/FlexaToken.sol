pragma solidity ^0.4.21;

import "./token/StandardToken.sol";

/**
 * @title The FlexaToken ERC20 Contract
 * @author Zachary Kilgore
 * @dev This contract is a standard ERC20 token.
 */
contract FlexaToken is StandardToken {

    string public name = "BoCoin";
    string public symbol = "QBO";
    uint8 public constant decimals = 18;
    uint256 public constant INITIAL_SUPPLY = 100000000000 * (10 ** uint256(decimals));

    function FlexaToken() public {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
        emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
    }

}