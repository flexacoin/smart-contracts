import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'react-router-redux'
import { Route } from 'react-router'
import DrizzleProvider from './components/DrizzleProvider'

// Layouts
import App from './App'

import store, { history } from './store'
import drizzleOptions from './drizzleOptions'

ReactDOM.render(
  <DrizzleProvider store={store} options={drizzleOptions}>
    <Provider store={store}>
      <ConnectedRouter history={history}>
        <App />
      </ConnectedRouter>
    </Provider>
  </DrizzleProvider>,
  document.getElementById('root')
)
