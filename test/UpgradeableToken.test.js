import { ZERO_ADDRESS } from './helpers/common'
import { assertRevert, EVMRevert } from './helpers/assertions'
import { increaseTime } from './helpers/time'
import { DECIMALS_FACTOR, tokens } from './helpers/flexacoin'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const UpgradeableTokenMock = artifacts.require('UpgradeableTokenMock')
const UpgradeAgentMock = artifacts.require('UpgradeAgentMock')

contract('UpgradeableToken', function([
  _,
  owner,
  accountMaster,
  secondMaster,
  otherAccount,
]) {
  const totalSupply = 1000

  beforeEach(async function() {
    this.token = await UpgradeableTokenMock.new(accountMaster, totalSupply, {
      from: owner,
    })
  })

  describe('Constructor', function() {
    describe('when upgrade master is zero address', function() {
      it('reverts', async function() {
        await assertRevert(
          UpgradeableTokenMock.new(ZERO_ADDRESS, totalSupply, { from: owner })
        )
      })
    })

    describe('when upgrade master is valid', function() {
      beforeEach(async function() {
        this.token = await UpgradeableTokenMock.new(
          accountMaster,
          totalSupply,
          {
            from: owner,
          }
        )
      })

      it('sets upgrade master', async function() {
        const upgradeMaster = await this.token.upgradeMaster()

        upgradeMaster.should.equal(accountMaster)
      })
    })
  })

  describe('setUpgradeMaster', function() {
    describe('when called by current upgrade master', function() {
      describe('when setting upgrade master to zero address', function() {
        it('reverts', async function() {
          await assertRevert(
            this.token.setUpgradeMaster(ZERO_ADDRESS, { from: accountMaster })
          )
        })
      })

      describe('when setting upgrade master to valid address', function() {
        const nextMaster = secondMaster

        beforeEach(async function() {
          await this.token.setUpgradeMaster(nextMaster, { from: accountMaster })
        })

        it('sets the upgrade master', async function() {
          const master = await this.token.upgradeMaster()
          master.should.equal(nextMaster)
        })
      })
    })

    describe('when called by other account', function() {
      const nextMaster = secondMaster

      it('reverts', async function() {
        await assertRevert(
          this.token.setUpgradeMaster(nextMaster, { from: otherAccount })
        )
      })
    })
  })

  describe('setUpgradeAgent', function() {
    describe('when called by current upgrade master', function() {
      describe('when setting upgrade agent to zero address', function() {
        it('reverts', async function() {
          await assertRevert(
            this.token.setUpgradeAgent(ZERO_ADDRESS, { from: accountMaster })
          )
        })
      })

      describe('when upgrade agent is a valid address', function() {
        describe('when setting upgrade agent to an invalid UpgradeAgent', function() {
          const upgradeAgent = otherAccount

          it('reverts', async function() {
            await assertRevert(
              this.token.setUpgradeAgent(upgradeAgent, {
                from: accountMaster,
              })
            )
          })
        })

        describe('when setting upgrade agent to a valid UpgradeAgent', function() {
          describe('that has an incorrect supply', function() {
            beforeEach(async function() {
              this.upgradeAgent = await UpgradeAgentMock.new(totalSupply + 1)
            })

            it('reverts', async function() {
              await assertRevert(
                this.token.setUpgradeAgent(this.upgradeAgent.address, {
                  from: accountMaster,
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
                from: accountMaster,
              })

              const upgradeAgent = await this.token.upgradeAgent()
              upgradeAgent.should.equal(this.upgradeAgent.address)
            })

            it('emits UpgradeAgentSet event', async function() {
              const { logs } = await this.token.setUpgradeAgent(
                this.upgradeAgent.address,
                {
                  from: accountMaster,
                }
              )

              logs.length.should.equal(1)
              logs[0].event.should.equal('UpgradeAgentSet')
              logs[0].args.agent.should.equal(this.upgradeAgent.address)
            })

            describe('when setting another valid UpgradeAgent', function() {
              beforeEach(async function() {
                this.upgradeAgent2 = await UpgradeAgentMock.new(totalSupply)
              })

              it('sets the upgrade agent and emits UpgradeAgentSet event', async function() {
                const { logs } = await this.token.setUpgradeAgent(
                  this.upgradeAgent2.address,
                  {
                    from: accountMaster,
                  }
                )

                const upgradeAgent = await this.token.upgradeAgent()
                upgradeAgent.should.equal(this.upgradeAgent2.address)

                logs.length.should.equal(1)
                logs[0].event.should.equal('UpgradeAgentSet')
                logs[0].args.agent.should.equal(this.upgradeAgent2.address)
              })
            })
          })
        })
      })
    })

    describe('when called by non upgrade master', function() {
      const nextMaster = secondMaster

      it('reverts', async function() {
        await assertRevert(
          this.token.setUpgradeMaster(nextMaster, { from: otherAccount })
        )
      })
    })
  })

  describe('upgrade', function() {
    describe('when contract is not in a valid upgradeable state', function() {
      it('fails needs tests')
    })

    describe('when the contract is in an upgradeable state', function() {
      describe('when called with no value', function() {
        it('fails needs tests')
      })

      describe('when called with greater than zero value', function() {
        describe(`when called with value greater than sender's balance`, function() {
          it('fails needs tests')
        })

        describe(`when called with sender's balance`, function() {
          it('works needs tests')
        })
      })
    })
  })

  describe('states', function() {
    it('needs tests')
  })
})
