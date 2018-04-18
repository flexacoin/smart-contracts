import { ZERO_ADDRESS, logTitle, logError } from './helpers/common'
import { assertRevert, EVMRevert } from './helpers/assertions'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const FlexaToken = artifacts.require('FlexaToken')
const TokenVault = artifacts.require('TokenVault')

contract('TokenVault', function(accounts) {
  const DECIMALS_FACTOR = new BigNumber('10').pow('18')

  const tokens = num => num * DECIMALS_FACTOR

  const owner = accounts[0]
  const account_one = accounts[1]
  const account_two = accounts[2]
  const account_three = accounts[3]

  before(async function() {
    this.token = await FlexaToken.new()

    this.vault = await TokenVault.new(
      this.token.address,
      tokens(1000),
      tokens(100)
    )
  })

  it('should be deployed', function() {
    const vaultAddress = this.vault.address
    assert(vaultAddress, 'TokenVault is not deployed')
    assert(
      vaultAddress !== ZERO_ADDRESS,
      'TokenVault address is the zero address'
    )
  })

  describe('TokenVault', function() {
    describe('Basic Properties', function() {
      it('should be owned', async function() {
        const vaultOwner = await this.vault.owner()
        vaultOwner.should.not.be.null
        vaultOwner.should.be.equal(owner)
      })

      it('should have token assigned correctly')
      it('should have tokens allocated correctly')
      it('should have bonuses allocated correctly')
    })

    describe('Pre-Finalize', function() {
      describe('Setting allocations', function() {
        it('cannot set for the zero address')
        it('cannot set a 0 amount')
      })

      describe('Other functionality', function() {
        it('can set for address 1')
        it('updates the allocated tokens')
        it('can set for address 2')
      })

      describe('Executing finalize', function() {
        it('works')
      })
    })

    describe('Post-Finalized', function() {
      // Reset the contracts here and successfully allocate
      beforeEach()
    })
  })
})
