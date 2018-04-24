# Flexa Smart Contracts

## Requirements

* [Node](https://nodejs.org/en/) (>= 7)
* [yarn](https://yarnpkg.com) package manager
* [truffle](http://truffleframework.com/)

## Repo

Clone the repository and initialize submodules:

```bash
git clone --recursive https://gitlab.com/flexaco/smart-contracts
```

[OpenZeppelin's standard solidity contracts repo](https://github.com/OpenZeppelin/zeppelin-solidity) has been included as a submodule, pinned to commit 6a7114fd.

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

## Deployment

Will use 2 vaults

* 1 with no vesting period for immediate claim
* 1 with 6 month vesting period for bonuses
