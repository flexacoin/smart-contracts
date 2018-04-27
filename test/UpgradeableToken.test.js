import { ZERO_ADDRESS } from './helpers/common'
import { assertRevert, assertThrow } from './helpers/assertions'
import { tokens } from './helpers/flexacoin'

const { BigNumber } = web3
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

// const Flexacoin = artifacts.require('Flexacoin')
const UpgradeableTokenMock = artifacts.require('UpgradeableTokenMock')
const UpgradeAgentMock = artifacts.require('UpgradeAgentMock')

contract('UpgradeableToken', function([
  _,
  owner,
  secondOwner,
  otherAccount,
  accountOne,
  accountTwo,
]) {
  const totalSupply = tokens(1000)

  beforeEach(async function() {
    this.token = await UpgradeableTokenMock.new(totalSupply, {
      from: owner,
    })
  })

  describe('Constructor', function() {
    it('sets owner', async function() {
      const upgradeOwner = await this.token.owner()

      upgradeOwner.should.equal(owner)
    })
  })

  describe('set new upgrade owner', function() {
    describe('when called by current owner', function() {
      describe('when setting upgrade owner to valid address', function() {
        const nextOwner = secondOwner

        beforeEach(async function() {
          await this.token.transferOwnership(nextOwner, { from: owner })
        })

        it('sets the pending owner', async function() {
          const pendingOwner = await this.token.pendingOwner()
          pendingOwner.should.equal(nextOwner)
        })

        describe('when non pending owner claims', function() {
          it('reverts', async function() {
            await assertRevert(
              this.token.claimOwnership({ from: otherAccount })
            )
          })
        })

        describe('when pending owner claims', function() {
          beforeEach(async function() {
            await this.token.claimOwnership({ from: nextOwner })
          })

          it('updates the contract owner', async function() {
            const newOwner = await this.token.owner()
            newOwner.should.equal(nextOwner)
          })
        })
      })
    })

    describe('when called by other account', function() {
      const nextOwner = secondOwner

      it('reverts', async function() {
        await assertRevert(
          this.token.transferOwnership(nextOwner, { from: otherAccount })
        )
      })
    })
  })

  describe('set upgrade agent', function() {
    describe('when called by current upgrade owner', function() {
      describe('when setting upgrade agent to zero address', function() {
        it('reverts', async function() {
          await assertRevert(
            this.token.setUpgradeAgent(ZERO_ADDRESS, { from: owner })
          )
        })
      })

      describe('when upgrade agent is a valid address', function() {
        describe('when setting upgrade agent to an invalid UpgradeAgent', function() {
          const upgradeAgent = otherAccount

          it('reverts', async function() {
            await assertRevert(
              this.token.setUpgradeAgent(upgradeAgent, {
                from: owner,
              })
            )
          })
        })

        describe('when setting upgrade agent to a valid UpgradeAgent', function() {
          describe('that has an incorrect supply', function() {
            beforeEach(async function() {
              const supply = totalSupply + tokens(1)
              this.upgradeAgent = await UpgradeAgentMock.new(supply)
            })

            it('reverts', async function() {
              await assertRevert(
                this.token.setUpgradeAgent(this.upgradeAgent.address, {
                  from: owner,
                })
              )
            })
          })

          describe('that has the correct supply', function() {
            beforeEach(async function() {
              this.upgradeAgent = await UpgradeAgentMock.new(totalSupply)
            })

            it('sets the upgrade agent', async function() {
              await this.token.setUpgradeAgent(this.upgradeAgent.address, {
                from: owner,
              })

              const upgradeAgent = await this.token.upgradeAgent()
              upgradeAgent.should.equal(this.upgradeAgent.address)
            })

            it('emits UpgradeAgentSet event', async function() {
              const { logs } = await this.token.setUpgradeAgent(
                this.upgradeAgent.address,
                {
                  from: owner,
                }
              )

              logs.length.should.equal(1)
              logs[0].event.should.equal('UpgradeAgentSet')
              logs[0].args.upgradeAgent.should.equal(this.upgradeAgent.address)
            })

            describe('when setting another valid UpgradeAgent', function() {
              beforeEach(async function() {
                this.upgradeAgent2 = await UpgradeAgentMock.new(totalSupply)
              })

              it('sets the upgrade agent and emits UpgradeAgentSet event', async function() {
                const { logs } = await this.token.setUpgradeAgent(
                  this.upgradeAgent2.address,
                  {
                    from: owner,
                  }
                )

                const upgradeAgent = await this.token.upgradeAgent()
                upgradeAgent.should.equal(this.upgradeAgent2.address)

                logs.length.should.equal(1)
                logs[0].event.should.equal('UpgradeAgentSet')
                logs[0].args.upgradeAgent.should.equal(
                  this.upgradeAgent2.address
                )
              })
            })
          })
        })
      })
    })

    describe('when called by non owner', function() {
      describe('with valid upgrade agent', function() {
        const from = otherAccount

        beforeEach(async function() {
          this.upgradeAgent = await UpgradeAgentMock.new(totalSupply)
        })

        it('reverts', async function() {
          await assertRevert(
            this.token.setUpgradeAgent(this.upgradeAgent.address, { from })
          )
        })
      })
    })
  })

  describe('upgrade', function() {
    /* First set up token balances */
    const amountAccountOne = tokens(100)
    const amountAccountTwo = tokens(150)
    beforeEach(async function() {
      await this.token.transfer(accountOne, amountAccountOne, { from: owner })
      await this.token.transfer(accountTwo, amountAccountTwo, { from: owner })
    })

    describe('when contract is not in a valid upgradeable state', function() {
      it('reverts', async function() {
        await assertRevert(
          this.token.upgrade(amountAccountOne, { from: accountOne })
        )
      })
    })

    describe('when the contract is in an upgradeable state', function() {
      /* To get to upgradeable state, set a valid upgrade agent */
      beforeEach(async function() {
        this.upgradeAgent = await UpgradeAgentMock.new(totalSupply, {
          from: owner,
        })

        await this.token.setUpgradeAgent(this.upgradeAgent.address, {
          from: owner,
        })
      })

      describe('when called by an account with a token balance > 0', function() {
        const from = accountOne

        describe('when called with 0 value', function() {
          it('reverts', async function() {
            await assertRevert(this.token.upgrade(0, { from }))
          })
        })

        describe('when called with greater than zero value', function() {
          describe(`when called with value greater than sender's balance`, function() {
            const value = tokens(200) // Twice as many as accountOne has

            it('reverts', async function() {
              await assertThrow(this.token.upgrade(value, { from }))
            })
          })

          describe(`when called with sender's balance`, function() {
            const value = amountAccountOne

            let tx
            let originalTotalSupply
            let originalTotalUpgraded
            beforeEach(async function() {
              originalTotalSupply = await this.token.totalSupply({ from })
              originalTotalUpgraded = await this.token.totalUpgraded({ from })
              tx = await this.token.upgrade(value, { from })
            })

            it('emits Upgrade event', function() {
              const { logs } = tx

              logs.length.should.equal(1)
              logs[0].event.should.equal('Upgrade')
              logs[0].args.from.should.equal(accountOne)
              logs[0].args.to.should.equal(this.upgradeAgent.address)
              logs[0].args.value.should.bignumber.equal(amountAccountOne)
            })

            it(`decrements the sender's token balance to 0`, async function() {
              const accountOneTokenBalance = await this.token.balanceOf(
                accountOne,
                { from }
              )

              accountOneTokenBalance.should.bignumber.equal(0)
            })

            it(`decrements the token's total supply by value upgraded`, async function() {
              const newTotalSupply = await this.token.totalSupply({ from })

              newTotalSupply.should.bignumber.equal(
                originalTotalSupply.minus(amountAccountOne)
              )
            })

            it(`increments the token's total upgraded by the value upgraded`, async function() {
              const newTotalUpgraded = await this.token.totalUpgraded({ from })

              newTotalUpgraded.should.bignumber.equal(
                originalTotalUpgraded.plus(amountAccountOne)
              )
            })

            it(`executes 'upgradeFrom' in the UpgradeAgent contract`, async function() {
              const accountOneNewBalance = await this.upgradeAgent.newBalances(
                accountOne,
                { from }
              )

              accountOneNewBalance.should.bignumber.equal(amountAccountOne)
            })
          })
        })
      })
    })
  })

  describe('states', function() {
    const upgradeStates = {
      Unknown: 0,
      NotAllowed: 1,
      WaitingForAgent: 2,
      ReadyToUpgrade: 3,
      Upgrading: 4,
    }

    const account = accountOne
    const amount = tokens(100)

    beforeEach(async function() {
      await this.token.transfer(account, amount, { from: owner })
    })

    describe('when upgrade agent is not set', function() {
      it(`returns 'WaitingForAgent'`, async function() {
        const state = await this.token.getUpgradeState()

        state.should.bignumber.equal(upgradeStates.WaitingForAgent)
      })
    })

    describe('when upgrade agent is set', function() {
      beforeEach(async function() {
        this.upgradeAgent = await UpgradeAgentMock.new(totalSupply, {
          from: owner,
        })

        await this.token.setUpgradeAgent(this.upgradeAgent.address, {
          from: owner,
        })
      })

      describe('and nothing has been upgraded yet', function() {
        it(`returns 'ReadyToUpgrade'`, async function() {
          const state = await this.token.getUpgradeState()

          state.should.bignumber.equal(upgradeStates.ReadyToUpgrade)
        })
      })

      describe('and upgrading has begun', function() {
        beforeEach(async function() {
          await this.token.upgrade(amount, { from: account })
        })

        it(`returns 'Upgrading'`, async function() {
          const state = await this.token.getUpgradeState()

          state.should.bignumber.equal(upgradeStates.Upgrading)
        })

        describe('when trying to set a new upgrade agent after upgrading has begun', function() {
          beforeEach(async function() {
            this.upgradeAgent2 = await UpgradeAgentMock.new(totalSupply)
          })

          it('reverts', async function() {
            await assertRevert(
              this.token.setUpgradeAgent(this.upgradeAgent2.address, {
                from: owner,
              })
            )
          })
        })
      })
    })
  })
})
