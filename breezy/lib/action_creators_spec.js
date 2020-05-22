import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import fetchMock from 'fetch-mock'
import {
  visit,
  remote,
  handleGraft,
  beforeFetch,
  handleError,
  saveResponse,
  ensureSingleVisit,
  saveAndProcessPage,
} from './action_creators'
import * as helpers from './utils/helpers'
import * as connect from './connector'
import * as rsp from '../spec/fixtures'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)
const delay = (duration) => {
  return new Promise((res, rej) => setTimeout(res, duration))
}
const initialState = () => {
  return {
    breezy: {
      currentUrl: '/bar',
      csrfToken: 'token',
      controlFlows: {
        visit: 'fakeUUID',
      },
    },
  }
}

const successfulBody = () => {
  return JSON.stringify({
    data: { heading: 'Some heading 2' },
    csrfToken: 'token',
    assets: [],
    defers: [],
  })
}

fdescribe('action creators', () => {
  describe('saveResponse', () => {
    it('fires SAVE_RESPONSE', () => {
      const pageKey = '/test'
      const page = { foo: 'bar' }

      const action = saveResponse({
        pageKey,
        page,
      })

      expect(action).toEqual({
        type: '@@breezy/SAVE_RESPONSE',
        payload: {
          pageKey,
          page,
        },
      })
    })
  })

  describe('handleGraft', () => {
    it('fires HANDLE_GRAFT', () => {
      const pageKey = '/test'
      const node = { d: 'foo' }
      const pathToNode = 'a.b'
      const fragments = [('foo': ['bar'])]
      const page = {
        data: {
          d: 'foo',
        },
        path: 'a.b',
        fragments: [['foo', 'bar']],
      }

      const action = handleGraft({
        pageKey,
        page,
      })

      expect(action).toEqual({
        type: '@@breezy/HANDLE_GRAFT',
        payload: { pageKey, page },
      })
    })
  })

  describe('saveAndProcessPage', () => {
    afterEach(() => {
      fetchMock.reset()
      fetchMock.restore()
    })

    it('fires SAVE_RESPONSE and process a page', () => {
      const page = {
        data: { heading: 'Some heading 2' },
        csrfToken: 'token',
        assets: [],
      }
      const store = mockStore(initialState())
      const expectedActions = [
        {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: {
              data: { heading: 'Some heading 2' },
              csrfToken: 'token',
              assets: [],
            },
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
      ]

      return store.dispatch(saveAndProcessPage('/foo', page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    it('handles deferments on the page and fires HANDLE_GRAFT', () => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      const page = {
        data: { heading: 'Some heading 2' },
        csrfToken: 'token',
        assets: [],
        defers: [{ url: '/foo?bzq=body', type: 'auto' }],
      }

      const expectedActions = [
        {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: page,
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: jasmine.any(Object),
        },
        {
          type: '@@breezy/HANDLE_GRAFT',
          payload: {
            pageKey: '/foo',
            page: {
              data: 'success',
              action: 'graft',
              path: 'body',
              csrfToken: 'token',
              assets: [],
              defers: [],
            },
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
      ]

      fetchMock.mock('/foo?bzq=body&__=0', {
        body: JSON.stringify({
          data: 'success',
          action: 'graft',
          path: 'body',
          csrfToken: 'token',
          assets: [],
          defers: [],
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      return store.dispatch(saveAndProcessPage('/foo', page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    it('ignores manual deferments on the page', () => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      const page = {
        data: { heading: 'Some heading 2' },
        csrfToken: 'token',
        assets: [],
        defers: [{ url: '/some_defered_request?bzq=body', type: 'manual' }],
      }

      const expectedActions = [
        {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: page,
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
      ]

      return store.dispatch(saveAndProcessPage('/foo', page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    it('fires HANDLE_GRAFT and process a page', () => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })

      const page = {
        data: 'success',
        action: 'graft',
        path: 'heading.cart',
        csrfToken: '',
        assets: [],
        defers: [],
      }

      const expectedActions = [
        {
          type: '@@breezy/HANDLE_GRAFT',
          payload: {
            pageKey: '/foo',
            page,
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
      ]

      return store.dispatch(saveAndProcessPage('/foo', page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    it('fires HANDLE_GRAFT, and process a page with a fragment', () => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })

      const page = {
        data: { status: 'success' },
        action: 'graft',
        path: 'data.heading.cart',
        csrfToken: '',
        fragments: {
          info: ['data.header.cart'],
        },
      }

      const expectedActions = [
        {
          type: '@@breezy/HANDLE_GRAFT',
          payload: {
            pageKey: '/foo',
            page,
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {
              info: { status: 'success' },
            },
          },
        },
      ]

      return store.dispatch(saveAndProcessPage('/foo', page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    //TODO: add tests for when type is mannual

    it('fires a GRAFTING_ERROR when a fetch fails', () => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      const page = {
        data: { heading: 'Some heading 2' },
        csrfToken: 'token',
        assets: [],
        defers: [{ url: '/some_defered_request?bzq=body', type: 'auto' }],
      }

      const expectedActions = [
        {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: page,
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: jasmine.any(Object),
        },
        {
          type: '@@breezy/ERROR',
          payload: jasmine.any(Object),
        },
        {
          type: '@@breezy/GRAFTING_ERROR',
          payload: {
            url: '/some_defered_request?bzq=body',
            pageKey: '/foo',
            err: jasmine.any(Object),
            keyPath: 'body',
          },
        },
      ]

      fetchMock.mock('/some_defered_request?bzq=body&__=0', 500)

      return store.dispatch(saveAndProcessPage('/foo', page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    it('When passed an empty url but fragments are available', () => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      const page = {
        data: {
          header: {
            email: 'j@j.com',
          },
        },
        action: 'graft',
        csrfToken: 'token',
        assets: [],
        defers: [],
        path: 'data.top',
        fragments: {
          abc123: ['data.top.header'],
        },
      }

      const expectedActions = [
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {
              abc123: {
                email: 'j@j.com',
              },
            },
          },
        },
      ]

      return store.dispatch(saveAndProcessPage(null, page)).then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
    })
  })

  describe('remote', () => {
    afterEach(() => {
      fetchMock.reset()
      fetchMock.restore()
    })

    it('fetches with correct headers and fires SAVE_RESPONSE', () => {
      const store = mockStore(initialState())
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      fetchMock.mock('/foo?__=0', {
        body: successfulBody(),
        headers: {
          'content-type': 'application/json',
        },
      })

      const expectedActions = [
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: { fetchArgs: ['/foo?__=0', jasmine.any(Object)] },
        },
        {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: {
              data: { heading: 'Some heading 2' },
              csrfToken: 'token',
              assets: [],
              defers: [],
            },
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
      ]

      return store.dispatch(remote('/foo', { pageKey: '/foo' })).then(() => {
        const requestheaders = fetchMock.lastCall('/foo?__=0')[1].headers

        expect(requestheaders).toEqual({
          accept: 'application/json',
          'x-xhr-referer': '/bar',
          'x-requested-with': 'XMLHttpRequest',
          'x-breezy-request': true,
          'x-csrf-token': 'token',
        })

        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    it('accepts a beforeSave to modify the response before saving', () => {
      const initialState = {
        pages: {
          '/foo': {
            data: {
              posts: ['post 1'],
            },
          },
        },
        breezy: {
          currentUrl: '/bar',
          csrfToken: 'token',
          controlFlows: {
            visit: 'fakeUUID',
          },
        },
      }
      const store = mockStore(initialState)
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      const body = {
        data: {
          posts: ['post 2'],
        },
        csrfToken: 'token',
        assets: [],
        defers: [],
      }

      fetchMock.mock('/foo?__=0', {
        body,
        headers: {
          'content-type': 'application/json',
          'x-response-url': '/foo',
        },
      })

      const expectedActions = [
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: { fetchArgs: ['/foo?__=0', jasmine.any(Object)] },
        },
        {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: {
              data: { posts: ['post 1', 'post 2'] },
              csrfToken: 'token',
              assets: [],
              defers: [],
            },
          },
        },
        {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {},
          },
        },
      ]

      const beforeSave = (prevPage, receivedPage) => {
        const receivedPosts = receivedPage.data.posts
        const prevPosts = prevPage.data.posts
        receivedPage.data.posts = [...prevPosts, ...receivedPosts]

        return receivedPage
      }

      return store
        .dispatch(remote('/foo', { beforeSave, pageKey: '/foo' }))
        .then(() => {
          expect(store.getActions()).toEqual(expectedActions)
        })
    })

    it('defaults to the currentUrl as the pageKey', (done) => {
      const store = mockStore({
        breezy: {
          currentUrl: '/current_url',
          csrfToken: 'token',
          controlFlows: {
            visit: 'fakeUUID',
          },
        },
      })

      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      fetchMock.mock('/foobar?__=0', {
        body: successfulBody(),
        headers: {
          'content-type': 'application/json',
        },
      })

      return store
        .dispatch(remote('/foobar', { method: 'POST' }))
        .then((meta) => {
          expect(meta).toEqual(
            jasmine.objectContaining({
              pageKey: '/current_url',
            })
          )

          done()
        })
    })

    it('uses the pageKey option to override the currentUrl as the preferred pageKey', (done) => {
      const store = mockStore({
        breezy: {
          currentUrl: '/url_to_be_overridden',
          csrfToken: 'token',
          controlFlows: {
            visit: 'fakeUUID',
          },
        },
      })

      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      fetchMock.mock('/foobar?__=0', {
        body: successfulBody(),
        headers: {
          'content-type': 'application/json',
        },
      })

      return store
        .dispatch(
          remote('/foobar', { method: 'POST', pageKey: '/bar_override' })
        )
        .then((meta) => {
          expect(meta).toEqual(
            jasmine.objectContaining({
              pageKey: '/bar_override',
            })
          )

          done()
        })
    })

    it('cleans any __ and - params', (done) => {
      const store = mockStore(initialState())
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      fetchMock.mock('/first?bzq=foo&__=0', rsp.visitSuccess())
      store.dispatch(remote('/first?bzq=foo&__=bar&_=baz')).then((meta) => {
        done()
      })
    })

    it('returns a meta with redirected true if was redirected', () => {
      const store = mockStore(initialState())
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      fetchMock.mock('/redirecting_url?__=0', {
        status: 200,
        redirectUrl: '/foo',
        headers: {
          'content-type': 'application/json',
          location: '/foo',
        },
        body: successfulBody(),
      })

      return store.dispatch(remote('/redirecting_url')).then((meta) => {
        expect(meta.redirected).toEqual(true)
      })
    })

    it('fires BREEZY_REQUEST_ERROR on a bad server response status', () => {
      const store = mockStore(initialState())
      fetchMock.mock('/foo?__=0', { body: '{}', status: 500 })

      const expectedActions = [
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: { fetchArgs: ['/foo?__=0', jasmine.any(Object)] },
        },
        {
          type: '@@breezy/ERROR',
          payload: { message: 'Internal Server Error' },
        },
      ]

      return store.dispatch(remote('/foo')).catch((err) => {
        expect(err.message).toEqual('Internal Server Error')
        expect(err.response.status).toEqual(500)
        expect(store.getActions()).toEqual(
          jasmine.objectContaining(expectedActions)
        )
      })
    })

    it('fires BREEZY_REQUEST_ERROR on a invalid response', () => {
      const store = mockStore(initialState())
      spyOn(connect, 'getStore').and.returnValue(store)
      fetchMock.mock('/foo?__=0', {
        status: 200,
        headers: {
          'content-type': 'text/bad',
        },
        body: '',
      })

      const expectedActions = [
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: { fetchArgs: ['/foo?__=0', jasmine.any(Object)] },
        },
        {
          type: '@@breezy/ERROR',
          payload: {
            message:
              'invalid json response body at /foo?__=0 reason: Unexpected end of JSON input',
          },
        },
      ]

      return store.dispatch(remote('/foo')).catch((err) => {
        expect(err.message).toEqual(
          'invalid json response body at /foo?__=0 reason: Unexpected end of JSON input'
        )
        expect(err.response.status).toEqual(200)
        expect(store.getActions()).toEqual(
          jasmine.objectContaining(expectedActions)
        )
      })
    })

    it('fires BREEZY_REQUEST_ERROR when the SJR returns nothing', () => {
      const store = mockStore(initialState())
      spyOn(connect, 'getStore').and.returnValue(store)

      fetchMock.mock('/foo?__=0', {
        body: ``,
        headers: {
          'content-type': 'application/json',
        },
      })

      const expectedActions = [
        {
          type: '@@breezy/BEFORE_FETCH',
          payload: { fetchArgs: ['/foo?__=0', jasmine.any(Object)] },
        },
        {
          type: '@@breezy/ERROR',
          payload: {
            message:
              'invalid json response body at /foo?__=0 reason: Unexpected end of JSON input',
          },
        },
      ]

      return store.dispatch(remote('/foo')).catch((err) => {
        expect(err.message).toEqual(
          'invalid json response body at /foo?__=0 reason: Unexpected end of JSON input'
        )
        expect(err.response.status).toEqual(200)
        expect(store.getActions()).toEqual(
          jasmine.objectContaining(expectedActions)
        )
      })
    })

    it('fires BREEZY_HANDLE_GRAFT when the response is a graft', (done) => {
      const store = mockStore({
        ...initialState(),
        pages: {
          '/foo': {},
        },
      })
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')
      fetchMock.mock('/foo?__=0', {
        body: JSON.stringify({
          data: 'success',
          action: 'graft',
          path: 'heading.cart',
          csrfToken: 'token',
          assets: [],
          defers: [],
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      store.subscribe(() => {
        const state = store.getState()
        const actions = store.getActions()
        const lastAction = actions[actions.length - 1]
        const { type, payload } = lastAction

        if (type === '@@breezy/HANDLE_GRAFT') {
          expect(payload).toEqual({
            pageKey: '/foo',
            page: {
              data: 'success',
              action: 'graft',
              path: 'heading.cart',
              csrfToken: 'token',
              assets: [],
              defers: [],
            },
          })

          done()
        }
      })

      store.dispatch(remote('/foo', { pageKey: '/foo' }))
    })
  })

  describe('visit', () => {
    afterEach(() => {
      fetchMock.reset()
      fetchMock.restore()
    })

    it('will only allow one navigatable visit at a time, any earlier requests just saves', (done) => {
      const initialState = {
        breezy: {
          assets: [],
          currentUrl: '/current',
          controlFlows: {
            visit: 'firstId',
          },
        },
      }

      const store = mockStore(initialState)
      spyOn(connect, 'getStore').and.returnValue(store)

      let mockResponse = rsp.visitSuccess()
      mockResponse.headers['x-response-url'] = '/first'
      fetchMock.mock(
        '/first?__=0',
        delay(500).then(() => mockResponse)
      )

      let mockResponse2 = rsp.visitSuccess()
      mockResponse2.headers['x-response-url'] = '/second'
      fetchMock.mock(
        '/second?__=0',
        delay(2000).then(() => mockResponse2)
      )

      const spy = spyOn(helpers, 'uuidv4')
      spy.and.returnValue('firstId')
      store.dispatch(visit('/first')).then((meta) => {
        expect(meta.canNavigate).toEqual(false)
      })

      spy.and.returnValue('secondId')
      initialState.breezy.controlFlows.visit = 'secondId'

      const expectedActions = [
        { type: '@@breezy/OVERRIDE_VISIT_SEQ', payload: { seqId: 'firstId' } },
        { type: '@@breezy/BEFORE_FETCH', payload: jasmine.any(Object) },
        { type: '@@breezy/OVERRIDE_VISIT_SEQ', payload: { seqId: 'secondId' } },
        { type: '@@breezy/BEFORE_FETCH', payload: jasmine.any(Object) },
        { type: '@@breezy/SAVE_RESPONSE', payload: jasmine.any(Object) },
        { type: '@@breezy/UPDATE_ALL_FRAGMENTS', payload: jasmine.any(Object) },
        { type: '@@breezy/SAVE_RESPONSE', payload: jasmine.any(Object) },
        { type: '@@breezy/UPDATE_ALL_FRAGMENTS', payload: jasmine.any(Object) },
      ]

      store.dispatch(visit('/second')).then((meta) => {
        expect(meta.canNavigate).toEqual(true)
        expect(store.getActions()).toEqual(expectedActions)
        done()
      })
    })

    it('cleans any bzq, __, and - params', (done) => {
      const initialState = {
        breezy: {
          assets: [],
          controlFlows: {
            visit: 'firstId',
          },
        },
      }

      const store = mockStore(initialState)
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'fakeUUID')

      fetchMock.mock('/first?__=0', rsp.visitSuccess())
      store.dispatch(visit('/first?bzq=foo&__=bar&_=baz')).then((meta) => {
        done()
      })
    })
  })

  describe('ensureSingleVisit', () => {
    it('takes a fn that returns a promise and resolves it with canNavigate:true with one active visit', (done) => {
      const initialState = {
        breezy: {
          controlFlows: {
            visit: 'nextId',
          },
        },
      }

      const store = mockStore(initialState)
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'nextId')

      const customVisit = ensureSingleVisit(() => {
        const meta = {}
        return Promise.resolve(meta)
      })

      store.dispatch(customVisit).then((meta) => {
        expect(meta.canNavigate).toEqual(true)
        done()
      })
    })

    it('takes a fn that returns a promise and resolves it with canNavigate:false when another ensureSingleVisit is called elsewhere', (done) => {
      const initialState = {
        breezy: {
          controlFlows: {
            visit: 'nextId',
          },
        },
      }

      const store = mockStore(initialState)
      spyOn(connect, 'getStore').and.returnValue(store)
      spyOn(helpers, 'uuidv4').and.callFake(() => 'nextId')

      const customVisit = ensureSingleVisit(() => {
        const meta = {}
        initialState.breezy.controlFlows.visit =
          'uuid_of_visit_that_got_initiated_elsewhere_while_this_was_resolving'
        return Promise.resolve(meta)
      })

      store.dispatch(customVisit).then((meta) => {
        expect(meta.canNavigate).toEqual(false)
        done()
      })
    })
  })
})
