import { ZERO_ADDRESS, logTitle, logError } from './helpers/common'
import { assertRevert, EVMRevert } from './helpers/assertions'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const FlexaToken = artifacts.require('FlexaToken')
const TokenVault = artifacts.require('TokenVault')

contract('TokenVault', function([_, owner, accountOne, accountTwo]) {
  const DECIMALS_FACTOR = new BigNumber('10').pow('18')

  // Helper function to normalize whole numbers to token values with decimals
  // applied
  const tokens = num => num * DECIMALS_FACTOR

  const tokensToBeAllocated = tokens(1000)
  const bonusesToBeAllocated = tokens(0)

  // Create instance of FlexaToken
  before(async function() {
    this.token = await FlexaToken.new({ from: owner })
    // this.token.address.should.not.be.null
    // this.token.address.should.not.be.equal(ZERO_ADDRESS)
  })

  // Create instance of TokenVault for each test
  beforeEach(async function() {
    this.vault = await TokenVault.new(
      this.token.address,
      tokensToBeAllocated,
      bonusesToBeAllocated,
      0,
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

  describe('bonusesToBeAllocated', function() {
    it('should have bonuses allocated correctly', async function() {
      const value = await this.vault.bonusesToBeAllocated()
      value.should.bignumber.equal(bonusesToBeAllocated)
    })
  })

  describe('totalClaimed', function() {})

  describe('finalizedAt', function() {})

  describe('unlockedAt', function() {})

  describe('setAllocationAndBonus', function() {
    const amount = tokens(10)

    describe('when caller is not the owner', async function() {
      const from = accountOne

      it('reverts', async function() {
        await assertRevert(
          this.vault.setAllocationAndBonus(accountOne, amount, 0, { from })
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
            this.vault.setAllocationAndBonus(beneficiary, amount, 0, { from })
          )
        })
      })

      describe('when beneficiary is not the zero address', function() {
        const beneficiary = accountOne

        describe('when amount is 0', function() {
          const amount = 0

          it('reverts', async function() {
            await assertRevert(
              this.vault.setAllocationAndBonus(beneficiary, amount, 0, { from })
            )
          })
        })

        describe('when amount is greater than 0', function() {
          it('emits an Allocated event', async function() {
            const { logs } = await this.vault.setAllocationAndBonus(
              beneficiary,
              amount,
              0,
              {
                from,
              }
            )

            logs.length.should.equal(1)
            logs[0].event.should.equal('Allocated')
            logs[0].args.beneficiary.should.equal(beneficiary)
            logs[0].args.value.should.bignumber.equal(amount)
          })

          it('updates tokens allocated to 10', async function() {
            await this.vault.setAllocationAndBonus(beneficiary, amount, 0, {
              from,
            })
            const tokensAllocated = await this.vault.tokensAllocated()
            tokensAllocated.should.bignumber.equal(tokens(10))
          })

          describe('when account already has allocation', async function() {
            beforeEach(async function() {
              await this.vault.setAllocationAndBonus(beneficiary, amount, 0, {
                from,
              })
            })

            it('reverts', async function() {
              await assertRevert(
                this.vault.setAllocationAndBonus(beneficiary, amount, 0, {
                  from,
                })
              )
            })

            describe('when allocating for another account', async function() {
              it('updates total tokens allocated to 20', async function() {
                await this.vault.setAllocationAndBonus(accountTwo, amount, 0, {
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

  describe('finalize', function() {
    describe('when called by owner', function() {
      const from = owner

      describe('when already finalized', function() {
        it('reverts')
      })

      describe('when all tokens have not been allocated', function() {
        it('reverts')
      })

      describe('when all tokens have been allocated', function() {
        describe('when vault does not have enough tokens', function() {
          it('reverts')
        })

        describe('when vault does has enough tokens', function() {
          it('emits Finalized event')
          it('updates finalizedAt')
        })
      })
    })

    describe('when called by non-owner', function() {
      const from = accountOne

      it('reverts', async function() {
        await assertRevert(this.vault.finalize({ from }))
      })
    })
  })

  describe('claim', function() {})

  describe('transfer', function() {})
})
