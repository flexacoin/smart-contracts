// Contents of https://github.com/OpenZeppelin/zeppelin-solidity/blob/a7e91856f3e275668b4a4c55cbd14864aa61b100/contracts/token/ERC20/ERC20Basic.sol
pragma solidity ^0.4.21;


/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
    function totalSupply() public view returns (uint256);
    function balanceOf(address who) public view returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}