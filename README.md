# Flexa Smart Contracts

## Requirements

* [Node](https://nodejs.org/en/) (>= 7)
* [yarn](https://yarnpkg.com) package manager
* [truffle](http://truffleframework.com/)

## Repo

Clone the repository and initialize submodules:

```bash
git clone --recursive https://github.com/flexahq/smart-contracts
```

[OpenZeppelin's standard solidity contracts repo](https://github.com/OpenZeppelin/zeppelin-solidity) has been included as a submodule, pinned to commit [4a10f727](https://github.com/OpenZeppelin/openzeppelin-solidity/tree/4a10f727c4756a8f6433f272a49e7a15db5e4b8f).

## Install Dependencies

```bash
yarn
```

## Testing

Tests are written in javascript and use featuers of the truffle framework.

Ensure `ganache-cli` is running. You only need to do this once.

```bash
yarn run ganache
```

Run all tests in the `/test` dir.

```bash
yarn test
```

Run tests with coverage (using [solidity-coverage](https://github.com/sc-forks/solidity-coverage))

```bash
yarn run coverage
```

**NOTE:** Tests use javascript's `async/await` syntax, so you will need Node >= 7 to run them.

## Smart Contracts

### Flexacoin

Flexacoin is a ERC20 compliant token. It is based on the OpenZeppelin StandardToken.sol, with the additional capabilities mixed in:

* Claimable: Owned contract where the transfer of ownership must be claimed
  by the new owner prior to the old owner being removed.
* Recoverable: Owned contract that allows the owner to recover ether and tokens
  sent to the contract in error that would otherwise be trapped.
* Pauseable: Owned contract that allows the ERC20 functionality (transfer,
  approval, etc) to be paused and unpaused by the owner in case of emergency.
* Upgradeable: Allows for the token to be upgraded to a new contract.

The token has the following properties:

```
Name: Flexacoin
Symbol: FXC
Decimals: 18
Initial Supply: 100,000,000,000
```

### TokenVault

TokenVault handles token distribution and lockup. It can be used to process and verify a distribution for a private token sale, as well as handle a vesting period if need be.

It inherits the following capabilities:

* Claimable: Owned contract where the transfer of ownership must be claimed
  by the new owner prior to the old owner being removed.
* Recoverable: Owned contract that allows the owner to recover ether and tokens
  sent to the contract in error that would otherwise be trapped.

## Smart Contract Audit

The Flexacoin smart contract and smart contract test code was audited for security and funtionality by [Dave Hoover](https://github.com/redsquirrel) on May 9th, 2018. His audit found no showstoppers or security vulnerabilities.

The complete report can be read [here](https://github.com/flexahq/smart-contracts-audit).
