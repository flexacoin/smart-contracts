import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'react-router-redux'
import { Route } from 'react-router'
import DrizzleProvider from './components/DrizzleProvider'

// Layouts
import App from './App'
import HomeContainer from './layouts/home/HomeContainer'

import store, { history } from './store'
import drizzleOptions from './drizzleOptions'

ReactDOM.render(
  <DrizzleProvider store={store} options={drizzleOptions}>
    <Provider store={store}>
      <ConnectedRouter history={history}>
        <App>
          <Route exact component={HomeContainer} />
        </App>
      </ConnectedRouter>
    </Provider>
  </DrizzleProvider>,
  document.getElementById('root')
)
