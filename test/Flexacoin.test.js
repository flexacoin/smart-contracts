import { tokens } from './helpers/flexacoin'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Flexacoin = artifacts.require('Flexacoin')

// Flexacoin token properties
const SYMBOL = 'FXC'
const NAME = 'Flexacoin'
const DECIMALS = 18
const INITIAL_SUPPLY = tokens(100000000000)

contract('Flexacoin', function([_, owner, accountOne]) {
  beforeEach(async function() {
    this.flexacoin = await Flexacoin.new({ from: owner })
  })

  describe('Constructor', function() {
    it('should transfer all tokens to the owner', async function() {
      const balance = await this.flexacoin.balanceOf(owner)

      balance.should.bignumber.equal(INITIAL_SUPPLY)
    })
  })

  describe('owner', function() {
    it('returns the owner', async function() {
      const contractOwner = await this.flexacoin.owner()

      contractOwner.should.equal(owner)
    })
  })

  describe('symbol', function() {
    it(`returns the symbol ${SYMBOL}`, async function() {
      const symbol = await this.flexacoin.symbol()

      symbol.should.equal(SYMBOL)
    })
  })

  describe('name', function() {
    it(`returns the name ${NAME}`, async function() {
      const name = await this.flexacoin.name()

      name.should.equal(NAME)
    })
  })

  describe('decimals', function() {
    it(`returns the number of decimals (${DECIMALS})`, async function() {
      const decimals = await this.flexacoin.decimals()

      decimals.should.bignumber.equal(DECIMALS)
    })
  })

  describe('can upgrade', function() {
    describe('when paused', function() {
      beforeEach(async function() {
        await this.flexacoin.pause({ from: owner })
      })

      it('returns false', async function() {
        const canUpgrade = await this.flexacoin.canUpgrade()

        canUpgrade.should.be.false
      })
    })

    describe('when not paused', function() {
      it('returns true', async function() {
        const canUpgrade = await this.flexacoin.canUpgrade()

        canUpgrade.should.be.true
      })
    })
  })
})
