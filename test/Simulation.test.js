import path from 'path'
import { assertRevert } from './helpers/assertions'
import { increaseTime } from './helpers/time'
import { tokens } from './helpers/flexacoin'

import { deployContracts } from './helpers/deploy'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

// Flexacoin token properties
const SYMBOL = 'FXC'
const NAME = 'Flexacoin'
const DECIMALS = 18
const INITIAL_SUPPLY = tokens(100000000000)

/*
  Integration tests to simulate deployment of Flexacoin and TokenVault contracts,
  as well as allocation scripts.

  Also simulate bonus time lock

  coinbase = '0x627306090abab3a6e1400e9345bc60c78a8bef57'
  deployer = '0xf17f52151ebef6c7334fad080c5704d77216b732'
  multisig = '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef'
*/

contract('Deployment Simulation', function([_, deployer]) {
  before(async function() {
    await deployContracts(
      deployer,
      path.join(__dirname, 'data/test_distribution.csv')
    )
  })

  describe('locking', function() {
    it('can be locked', async function() {
      // Lock the token vault and bonus vault allocations
      // await this.tokenVault.lock({ from: deployer })
      // await this.bonusVault.lock({ from: deployer })
    })
  })
})
