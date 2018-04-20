import { ZERO_ADDRESS } from './helpers/common'
import { assertRevert, EVMRevert } from './helpers/assertions'
import { increaseTime } from './helpers/time'
import { DECIMALS_FACTOR, tokens } from './helpers/flexacoin'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Flexacoin = artifacts.require('Flexacoin')
const TokenVault = artifacts.require('TokenVault')

contract('TokenVault', function([
  _,
  owner,
  accountOne,
  accountTwo,
  accountThree,
]) {
  const tokensToBeAllocated = tokens(1000)
  const vestingPeriod = 60 // 1 minute

  // Create instance of Flexacoin
  before(async function() {
    this.token = await Flexacoin.new({ from: owner })
  })

  // Create instance of TokenVault for each test
  beforeEach(async function() {
    this.vault = await TokenVault.new(
      this.token.address,
      tokensToBeAllocated,
      vestingPeriod,
      { from: owner }
    )
  })

  describe('owner', function() {
    it('returns the owner', async function() {
      const vaultOwner = await this.vault.owner()

      vaultOwner.should.equal(owner)
    })
  })

  describe('token', function() {
    it('returns the token address', async function() {
      const tokenAddress = await this.vault.token()

      tokenAddress.should.not.be.null
      tokenAddress.should.equal(this.token.address)
    })
  })

  describe('tokensToBeAllocated', function() {
    it('returns the tokens to be allocated', async function() {
      const value = await this.vault.tokensToBeAllocated()
      value.should.bignumber.equal(tokensToBeAllocated)
    })
  })

  describe('vestingPeriod', function() {
    it('returns the vesting period', async function() {
      const value = await this.vault.vestingPeriod()
      value.should.bignumber.equal(vestingPeriod)
    })
  })

  describe('setAllocation', function() {
    const amount = tokens(10)

    describe('when caller is not the owner', async function() {
      const from = accountOne

      it('reverts', async function() {
        await assertRevert(
          this.vault.setAllocation(accountOne, amount, { from })
        )
      })
    })

    describe('when caller is the owner', function() {
      const from = owner

      describe('when beneficiary is the zero address', function() {
        const beneficiary = ZERO_ADDRESS
        const amount = tokens(10)

        it('reverts', async function() {
          await assertRevert(
            this.vault.setAllocation(beneficiary, amount, { from })
          )
        })
      })

      describe('when beneficiary is not the zero address', function() {
        const beneficiary = accountOne

        describe('when amount is 0', function() {
          const amount = 0

          it('reverts', async function() {
            await assertRevert(
              this.vault.setAllocation(beneficiary, amount, { from })
            )
          })
        })

        describe('when amount is greater than 0', function() {
          it('emits an Allocated event', async function() {
            const { logs } = await this.vault.setAllocation(
              beneficiary,
              amount,
              {
                from,
              }
            )

            logs.length.should.equal(1)
            logs[0].event.should.equal('Allocated')
            logs[0].args.beneficiary.should.equal(beneficiary)
            logs[0].args.amount.should.bignumber.equal(amount)
          })

          it('updates tokens allocated to 10', async function() {
            await this.vault.setAllocation(beneficiary, amount, {
              from,
            })
            const tokensAllocated = await this.vault.tokensAllocated()
            tokensAllocated.should.bignumber.equal(tokens(10))
          })

          describe('when account already has allocation', async function() {
            beforeEach(async function() {
              await this.vault.setAllocation(beneficiary, amount, {
                from,
              })
            })

            it('reverts', async function() {
              await assertRevert(
                this.vault.setAllocation(beneficiary, amount, {
                  from,
                })
              )
            })

            describe('when allocating for another account', async function() {
              it('updates total tokens allocated to 20', async function() {
                await this.vault.setAllocation(accountTwo, amount, {
                  from,
                })

                const tokensAllocated = await this.vault.tokensAllocated()
                tokensAllocated.should.bignumber.equal(tokens(20))
              })
            })
          })
        })
      })
    })
  })

  describe('lock', function() {
    describe('when called by owner', function() {
      const from = owner

      describe('when all tokens have not been allocated', function() {
        beforeEach(async function() {
          await this.token.transfer(this.vault.address, tokens(1000), { from })
          await this.vault.setAllocation(accountOne, tokens(500), { from })
        })

        it('reverts', async function() {
          await assertRevert(this.vault.lock({ from }))
        })
      })

      describe('when all tokens have been allocated', function() {
        beforeEach(async function() {
          await this.vault.setAllocation(accountOne, tokens(1000), { from })
        })

        describe('when vault does not have enough tokens', function() {
          beforeEach(async function() {
            await this.token.transfer(this.vault.address, tokens(500), { from })
          })

          it('reverts', async function() {
            await assertRevert(this.vault.lock({ from }))
          })
        })

        describe('when vault does has enough tokens', function() {
          beforeEach(async function() {
            await this.token.transfer(this.vault.address, tokens(1000), {
              from,
            })
          })

          it('emits Locked event', async function() {
            const { logs } = await this.vault.lock({ from })

            logs.length.should.equal(1)
            logs[0].event.should.equal('Locked')
          })

          it('updates locked time', async function() {
            const tx = await this.vault.lock({ from })
            const lockedAt = await this.vault.lockedAt()

            lockedAt.should.be.bignumber.gt(0)
          })

          describe('when already locked', function() {
            beforeEach(async function() {
              await this.vault.lock({ from })
            })

            it('reverts', async function() {
              await assertRevert(this.vault.lock({ from }))
            })
          })
        })
      })
    })

    describe('when called by non-owner', function() {
      const from = accountOne

      it('reverts', async function() {
        await assertRevert(this.vault.lock({ from }))
      })
    })
  })

  describe('unlock', function() {
    describe('when called by owner', function() {
      const from = owner

      describe('when loading', function() {
        it('reverts', async function() {
          await assertRevert(this.vault.unlock({ from }))
        })
      })

      describe('when locked', function() {
        beforeEach(async function() {
          // Must be locked first
          await this.token.transfer(this.vault.address, tokens(1000), {
            from: owner,
          })
          await this.vault.setAllocation(accountOne, tokens(1000), {
            from: owner,
          })
          await this.vault.lock({ from: owner })
        })

        describe('before vesting time has passed', function() {
          it('reverts', async function() {
            await assertRevert(this.vault.unlock({ from }))
          })
        })

        describe('after vesting time has passed', function() {
          let tx
          beforeEach(async function() {
            await increaseTime(vestingPeriod * 2)
            tx = await this.vault.unlock({ from })
          })

          it('emits Unlocked event', function() {
            const { logs } = tx

            logs.length.should.equal(1)
            logs[0].event.should.equal('Unlocked')
          })

          it('updates unlocked time', async function() {
            const unlockedAt = await this.vault.unlockedAt()
            unlockedAt.should.be.bignumber.gt(0)
          })

          describe('when already unlocked', function() {
            it('reverts', async function() {
              await assertRevert(this.vault.unlock({ from }))
            })
          })
        })
      })
    })

    describe('when called by non-owner', function() {
      it('reverts', async function() {
        await assertRevert(this.vault.unlock({ from: accountOne }))
      })
    })
  })

  describe('claim', function() {
    beforeEach(async function() {
      const from = owner
      await this.token.transfer(this.vault.address, tokens(1000), { from })
      await this.vault.setAllocation(accountOne, tokens(600), { from })
      await this.vault.setAllocation(accountTwo, tokens(400), { from })
    })

    describe('when vault loading', function() {
      it('reverts', async function() {
        await assertRevert(this.vault.claim({ from: accountOne }))
      })
    })

    describe('when vault locked', function() {
      it('reverts', async function() {
        await this.vault.lock({ from: owner })
        await assertRevert(this.vault.claim({ from: accountOne }))
      })
    })

    describe('when vault unlocked', function() {
      beforeEach(async function() {
        await this.vault.lock({ from: owner })
        await increaseTime(vestingPeriod * 2)
        await this.vault.unlock({ from: owner })
      })

      describe('when account has tokens to claim', function() {
        const from = accountOne

        let tx
        beforeEach(async function() {
          tx = await this.vault.claim({ from })
        })

        it('emits Distributed event', async function() {
          const { logs } = tx

          logs.length.should.equal(1)
          logs[0].event.should.equal('Distributed')
          logs[0].args.beneficiary.should.equal(accountOne)
          logs[0].args.amount.should.bignumber.equal(tokens(600))
        })

        it('updates total claimed', async function() {
          const totalClaimed = await this.vault.totalClaimed({ from })

          totalClaimed.should.be.bignumber.equal(tokens(600))
        })

        it('updates claimed for account', async function() {
          const claimed = await this.vault.claimed(accountOne, { from })

          claimed.should.be.bignumber.equal(tokens(600))
        })

        describe('when original account tries to claim again', function() {
          it('reverts', async function() {
            await assertRevert(this.vault.claim({ from }))
          })
        })

        describe(`when another account claims it's tokens`, function() {
          const from = accountTwo

          let tx
          beforeEach(async function() {
            tx = await this.vault.claim({ from })
          })

          it('emits Distributed event', async function() {
            const { logs } = tx

            logs.length.should.equal(1)
            logs[0].event.should.equal('Distributed')
            logs[0].args.beneficiary.should.equal(accountTwo)
            logs[0].args.amount.should.bignumber.equal(tokens(400))
          })

          it('updates total claimed', async function() {
            const totalClaimed = await this.vault.totalClaimed({ from })

            totalClaimed.should.be.bignumber.equal(tokens(1000))
          })

          it('updates claimed for account', async function() {
            const claimed = await this.vault.claimed(accountTwo, { from })

            claimed.should.be.bignumber.equal(tokens(400))
          })
        })
      })

      describe('when account has no tokens to claim', function() {
        const from = accountThree
        it('reverts', async function() {
          await assertRevert(this.vault.claim({ from }))
        })
      })
    })
  })

  describe('transfer for', function() {
    // Setup the vault
    beforeEach(async function() {
      const from = owner
      await this.token.transfer(this.vault.address, tokens(1000), { from })
      await this.vault.setAllocation(accountOne, tokens(600), { from })
      await this.vault.setAllocation(accountTwo, tokens(400), { from })
    })

    describe('when vault loading', function() {
      it('reverts', async function() {
        await assertRevert(this.vault.claim({ from: accountOne }))
      })
    })

    describe('when vault locked', function() {
      it('reverts', async function() {
        await this.vault.lock({ from: owner })
        await assertRevert(this.vault.claim({ from: accountOne }))
      })
    })

    describe('when vault unlocked', function() {
      beforeEach(async function() {
        await this.vault.lock({ from: owner })
        await increaseTime(vestingPeriod * 2)
        await this.vault.unlock({ from: owner })
      })

      describe('when called by owner', function() {
        const from = owner

        describe('when beneficiary has an allocation', function() {
          const beneficiary = accountOne

          let tx
          beforeEach(async function() {
            tx = await this.vault.transferFor(beneficiary, { from })
          })

          it('emits Distributed event', async function() {
            const { logs } = tx

            logs.length.should.equal(1)
            logs[0].event.should.equal('Distributed')
            logs[0].args.beneficiary.should.equal(accountOne)
            logs[0].args.amount.should.bignumber.equal(tokens(600))
          })

          it('updates total claimed', async function() {
            const totalClaimed = await this.vault.totalClaimed({ from })

            totalClaimed.should.be.bignumber.equal(tokens(600))
          })

          it('updates claimed for account', async function() {
            const claimed = await this.vault.claimed(accountOne, { from })

            claimed.should.be.bignumber.equal(tokens(600))
          })

          describe('when original account tries to claim again', function() {
            it('reverts', async function() {
              await assertRevert(this.vault.claim({ from }))
            })
          })

          describe(`when another account claims it's tokens`, function() {
            const beneficiary = accountTwo

            let tx
            beforeEach(async function() {
              tx = await this.vault.transferFor(beneficiary, { from })
            })

            it('emits Distributed event', async function() {
              const { logs } = tx

              logs.length.should.equal(1)
              logs[0].event.should.equal('Distributed')
              logs[0].args.beneficiary.should.equal(accountTwo)
              logs[0].args.amount.should.bignumber.equal(tokens(400))
            })

            it('updates total claimed', async function() {
              const totalClaimed = await this.vault.totalClaimed({ from })

              totalClaimed.should.be.bignumber.equal(tokens(1000))
            })

            it('updates claimed for account', async function() {
              const claimed = await this.vault.claimed(accountTwo, { from })

              claimed.should.be.bignumber.equal(tokens(400))
            })
          })
        })

        describe('when account has no tokens to claim', function() {
          it('reverts', async function() {
            await assertRevert(this.vault.transferFor(accountThree, { from }))
          })
        })
      })

      describe('when called by non-owner', function() {
        it('reverts', async function() {
          await assertRevert(
            this.vault.transferFor(accountOne, { from: accountOne })
          )
        })
      })
    })
  })
})
