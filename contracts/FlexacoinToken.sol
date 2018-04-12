pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";

contract BoToken is MintableToken {
    string public name = "BoCoin";
    string public symbol = "QBO";
    uint public decimals = 18;
    uint public INITIAL_SUPPLY = 100000000000 * (10 ** decimals);

    function BoToken() public {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }
}