import { compose } from 'redux'
import { connect } from 'react-redux'
import drizzleConnect from '../../util/drizzleConnect'

import Home from './Home'

const mapStateToProps = state => {
  return {
    simpleStorage: state.contracts.SimpleStorage,
    tutorialToken: state.contracts.TutorialToken,
    drizzleStatus: state.drizzleStatus,
    accounts: state.accounts,
    web3: state.web3,
  }
}

export default compose(drizzleConnect, connect(mapStateToProps))(Home)
