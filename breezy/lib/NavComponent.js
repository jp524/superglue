import React from 'react'
import { urlToPageKey } from './utils/url'
import { uuidv4 } from './utils/helpers'
import parse from 'url-parse'
import { BREEZY_ERROR, OVERRIDE_VISIT_SEQ, HISTORY_CHANGE } from './actions'

function argsForHistory(url) {
  const pageKey = urlToPageKey(url)

  return [
    pageKey,
    {
      breezy: true,
      pageKey,
    },
  ]
}

function argsForNavInitialState(url) {
  return {
    pageKey: urlToPageKey(url),
    ownProps: {},
  }
}

class Nav extends React.Component {
  constructor(props) {
    super(props)
    const { history, initialPageKey } = this.props

    this.history = history
    this.navigateTo = this.navigateTo.bind(this)
    this.onHistoryChange = this.onHistoryChange.bind(this)
    this.state = argsForNavInitialState(initialPageKey)
  }

  componentDidMount() {
    const { initialPageKey } = this.props

    this.unsubscribeHistory = this.history.listen(this.onHistoryChange)
    this.history.replace(...argsForHistory(initialPageKey))
  }

  navigateTo(pageKey, { action, ownProps } = { action: 'push', ownProps: {} }) {
    pageKey = urlToPageKey(pageKey)
    const { store } = this.props
    const hasPage = !!store.getState().pages[pageKey]

    if (hasPage) {
      const historyArgs = [
        pageKey,
        {
          pageKey,
          breezy: true,
        },
      ]

      if (action === 'push') {
        this.history.push(...historyArgs)
      }

      if (action === 'replace') {
        this.history.replace(...historyArgs)
      }

      const seqId = uuidv4()
      store.dispatch({
        type: OVERRIDE_VISIT_SEQ,
        payload: {
          seqId,
        },
      })

      this.setState({ pageKey, ownProps })
      return true
    } else {
      return false
    }
  }

  // TODO: parse without bzq??
  onHistoryChange(location, action) {
    const { store } = this.props
    store.dispatch({
      type: HISTORY_CHANGE,
      payload: {
        url: parse(location.pathname + location.search).href,
      },
    })

    if (action === 'POP') {
      const { pageKey } = location.state
      const wasNotRefreshed = !!store.getState().pages[pageKey]

      if (location.state && location.state.breezy && wasNotRefreshed) {
        this.setState({ pageKey })
      } else {
        // load previous page
        window.location = location.pathname
      }
    }
  }

  notFound(identifier) {
    const { store } = this.props
    let reminder = ''
    if (!identifier) {
      reminder =
        'Did you forget to add `json.component_identifier` in your application.json.props layout?'
    }

    const error = new Error(
      `Breezy Nav component was looking for ${identifier} but could not find it in your mapping. ${reminder}`
    )

    store.dispatch({
      type: BREEZY_ERROR,
      payload: {
        message: error.message,
      },
    })

    throw error
  }

  render() {
    const { mapping, store } = this.props

    const { pageKey, ownProps } = this.state
    const { componentIdentifier } = store.getState().pages[pageKey]
    const Component = mapping[componentIdentifier]

    if (Component) {
      return (
        <Component
          pageKey={pageKey}
          navigateTo={this.navigateTo}
          {...ownProps}
        />
      )
    } else {
      this.notFound(componentIdentifier)
    }
  }
}

export default Nav
