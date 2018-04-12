import React from 'react'
import { BigNumber } from 'bignumber.js'
import { LoadingContainer } from 'drizzle-react-components'

import AccountData from './AccountData'
import ContractForm from './ContractForm'
import ContractData from './ContractData'

const DECIMALS_FACTOR = new BigNumber('10').pow(18)

const Home = props => {
  const { accounts, drizzle } = props
  return (
    <LoadingContainer>
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <h1>Flexacoin Token</h1>
            <p>
              <strong>Total Supply</strong>:{' '}
              <ContractData contract="FlexacoinToken" method="totalSupply" />{' '}
            </p>

            <p>
              <strong>Symbol</strong>:{' '}
              <ContractData contract="FlexacoinToken" method="symbol" />
            </p>

            <p>
              <strong>Decimals</strong>:{' '}
              <ContractData contract="FlexacoinToken" method="decimals" />
            </p>
          </div>

          <div>
            <div className="pure-u-1-1">
              <h2>Active Account</h2>

              <AccountData accountIndex="0" units="ether" precision="3" />
            </div>

            <div className="pure-u-1-1">
              <h2>My Flexacoin Balance</h2>

              <ContractData
                contract="FlexacoinToken"
                method="balanceOf"
                methodArgs={[accounts[0]]}
              />

              <h3>Send Tokens</h3>

              <ContractForm
                contract="FlexacoinToken"
                method="transfer"
                labels={['To Address', 'Amount to Send']}
                drizzle={drizzle}
              />
            </div>
          </div>
        </div>
      </main>
    </LoadingContainer>
  )
}

export default Home
