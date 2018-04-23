import { ZERO_ADDRESS } from './helpers/common'
import { assertRevert, EVMRevert } from './helpers/assertions'
import { increaseTime } from './helpers/time'
import { DECIMALS_FACTOR, tokens } from './helpers/flexacoin'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Recoverable = artifacts.require('PayableRecoverableMock')
const Flexacoin = artifacts.require('Flexacoin')

contract('Recoverable', function([_, owner, accountOne]) {
  // Create instance of PayableRecoverableMock for each test
  beforeEach(async function() {
    const recoverable = await Recoverable.new({ from: owner })
    this.recoverable = recoverable
    this.recoverableAddr = recoverable.address
  })

  describe('owner', function() {
    it('returns the owner', async function() {
      const contractOwner = await this.recoverable.owner({ from: accountOne })

      contractOwner.should.equal(owner)
    })
  })

  describe('reclaimEther', function() {
    const weiValue = web3.toWei(1, 'ether')

    beforeEach(async function() {
      await web3.eth.sendTransaction({
        from: accountOne,
        to: this.recoverableAddr,
        value: weiValue,
      })
    })

    describe('when called by owner', function() {
      const from = owner

      it('transfers ether to owner', async function() {
        const oldBalance = await web3.eth.getBalance(owner)

        await this.recoverable.reclaimEther({ from })
        const newBalance = await web3.eth.getBalance(owner)

        newBalance.should.be.bignumber.gt(oldBalance)
      })
    })

    describe('when called by non-owner', function() {
      const from = accountOne

      it('reverts', async function() {
        await assertRevert(this.recoverable.reclaimEther({ from }))
      })
    })
  })

  describe('reclaimToken', function() {
    const amount = tokens(10)

    beforeEach(async function() {
      this.token = await Flexacoin.new({ from: owner })
      this.token.transfer(this.recoverableAddr, amount, { from: owner })
    })

    describe('when called by owner', function() {
      const from = owner

      describe('when the contract has some of the tokens', function() {
        it('transfers tokens to the owner', async function() {
          const oldBalance = await this.token.balanceOf(owner)
          await this.recoverable.reclaimToken(this.token.address, { from })
          const newBalance = await this.token.balanceOf(owner)

          newBalance.should.be.bignumber.equal(oldBalance.plus(amount))
        })
      })
    })

    describe('when called by non-owner', function() {
      const from = accountOne

      it('reverts', async function() {
        await assertRevert(
          this.recoverable.reclaimToken(this.token.address, { from })
        )
      })
    })
  })
})
