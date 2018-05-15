# Flexa Smart Contract Audit

Dave Hoover\
May 9, 2018\
[dave.hoover@gmail.com](mailto@dave.hoover@gmail.com)

## Table of Contents

1.  [Table of Contents](#table-of-contents)
1.  [Contracts covered](#contracts-covered)
1.  [Summary](#summary)
1.  [Showstoppers](#showstoppers)
1.  [Concerns](#concerns)
1.  [Recommendations](#recommendations)

## Contracts covered

This audit covers the following contracts at commit e7b010:

* FlexaCoin
* UpgradeableToken
* UpgradeAgent
* Recoverable
* TokenVault

## Summary

The Flexa contracts are extremely well tested, with both unit tests and an integration test (simulation). Notably, there is no on-chain token sale involved in these contracts. The deployer of FlexaCoin will initially possess all 100,000,000 FXC ERC-20-compatible tokens. There is vault functionality that will allow the deployer of FlexaCoin to allocate tokens to whoever they want, with possible vesting periods. Most of the complexity in these smart contracts comes from the upgradeable functionality, which was based on [TokenMarketNet’s implementation](https://github.com/TokenMarketNet/ico/blob/master/contracts/UpgradeableToken.sol). All Flexa contracts leverage the widely-used foundational contracts in [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-solidity).

The Flexa contracts have no interaction with untrusted contracts, assuming that the owner of the FlexaCoin contract can be trusted. Therefore, there should be no risk of bad actors attacking FlexaCoin. But this does introduce a point of trust in the system. The FlexaCoin owner does have the power to provide any UpgradeAgent that they choose. This risk is mitigated by the fact that FXC token holders have control over whether they upgrade or not. They can choose to leave their tokens in the original FlexaCoin contract, or choose to migrate their tokens to the upgraded token contract.

## Showstoppers

There are no known issues that would prevent these contracts from being deployed and work as expected.

## Concerns

UpgradeAgent.isUpgradeAgent provides a naive safety check, this only ensures that the contract has implemented this one method. It does not ensure that it conforms to the entire UpgradeAgent interface. If true interface detection is desired, please refer to [EIP 881](https://github.com/ethereum/EIPs/pull/881).

As mentioned in the summary, setUpgradeAgent is the biggest source of risk in this system as it requires that token holders trust the contract owner to establish a safe token upgrade contract. Extra precautions should be taken to secure the private key of the contract owner’s account. It may also make sense to consider using [Multiownable](https://github.com/bitclave/Multiownable) to mitigate the risk of theft or loss of a single owner’s private key.

## Recommendations

Change Migrations.sol to use the new Solidity constructor syntax in order to avoid compiler warning.

## Commendations

Using the [latest stable version of Solidity](https://github.com/ethereum/solidity/releases/tag/v0.4.23), along with newer features such as providing error reason strings with require.

Using [SafeMath](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/math/SafeMath.sol) to avoid integer overflow and underflow bugs.
