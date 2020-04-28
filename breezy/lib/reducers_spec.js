import {
  pageReducer,
  metaReducer,
  controlFlowReducer,
  graftNodeOntoPage,
  updateSameFragmentsOnPage,
  appendReceivedFragmentsOntoPage,
  handleGraft,
} from '../lib/reducers'

describe('reducers', () => {
  describe('meta reducer', () => {
    describe('BREEZY_HISTORY_CHANGE', () => {
      it('sets the currentUrl', () => {
        const prevState = { foo: 'bar' }
        const action = {
          type: '@@breezy/HISTORY_CHANGE',
          payload: {
            url: '/some_url',
          },
        }
        const nextState = metaReducer(prevState, action)

        expect(nextState).toEqual({
          foo: 'bar',
          currentUrl: '/some_url',
        })
      })
    })

    describe('BREEZY_SET_BASE_URL', () => {
      it('sets the base URL', () => {
        const prevState = { foo: 'bar' }
        const action = {
          type: '@@breezy/SET_BASE_URL',
          payload: {
            baseUrl: '/some_url',
          },
        }
        const nextState = metaReducer(prevState, action)

        expect(nextState).toEqual({
          foo: 'bar',
          baseUrl: '/some_url',
        })
      })
    })

    describe('BREEZY_SAVE_RESPONSE', () => {
      it('saves the response csrfToken', () => {
        const prevState = { foo: 'bar' }
        const action = {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            page: {
              csrfToken: 'some_token',
            },
          },
        }
        const nextState = metaReducer(prevState, action)

        expect(nextState).toEqual({
          foo: 'bar',
          csrfToken: 'some_token',
        })
      })
    })

    describe('BREEZY_SET_CSRF_TOKEN', () => {
      it('sets the initial CSRF token', () => {
        const prevState = { foo: 'bar' }
        const action = {
          type: '@@breezy/SET_CSRF_TOKEN',
          payload: {
            csrfToken: 'some_token',
          },
        }
        const nextState = metaReducer(prevState, action)

        expect(nextState).toEqual({
          foo: 'bar',
          csrfToken: 'some_token',
        })
      })
    })
  })

  describe('page reducer', () => {
    describe('BREEZY_HANDLE_GRAFT', () => {
      describe('when receiving a page with fragments to append', () => {
        it('pushes new fragments into the current pages empty fragment', () => {
          const prevState = {
            '/foo': {
              data: {
                a: { b: { c: {} } },
              },
              fragments: {},
              flashes: [],
            },
          }

          const receivedPage = {
            data: {},
            path: 'data.a.b.c',
            fragments: {
              header: ['data.a.b.c'],
            },
            flashes: [],
          }

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })

          expect(nextState).toEqual({
            '/foo': {
              data: {
                a: { b: { c: {} } },
              },
              fragments: {
                header: ['data.a.b.c'],
              },
              flashes: [],
            },
          })
        })

        it('ignore duplicates when pushing a new fragment', () => {
          const prevState = {
            '/foo': {
              data: {
                a: { b: { c: {} } },
              },
              fragments: {
                header: ['data.a.b.c'],
              },
              flashes: [],
            },
          }
          const receivedPage = {
            data: {},
            path: 'data.a.b.c',
            fragments: {
              header: ['data.a.b.c'],
            },
            flashes: [],
          }

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })

          expect(nextState).toEqual({
            '/foo': {
              data: {
                a: { b: { c: {} } },
              },
              fragments: {
                header: ['data.a.b.c'],
              },
              flashes: []
            },
          })
        })
      })

      describe('Updating fragments on the current page with the same name as the received page', () => {
        it('does no additional update if there is no fragments in the current page', () => {
          const prevState = {
            '/foo': {
              data: {
                a: { b: { c: {} } },
                d: { e: { f: {} } },
              },
              fragments: {},
              flashes: [],
            },
          }

          const receivedPage = {
            data: {},
            path: 'data.d.e.f',
            fragments: {
              header: ['data.d.e.f'],
            },
            flashes: [],
          }

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })

          expect(nextState).toEqual({
            '/foo': {
              data: {
                a: { b: { c: {} } },
                d: { e: { f: {} } },
              },
              fragments: {
                header: ['data.d.e.f'],
              },
              flashes: []
            },
          })
        })

        it('updates no fragment when there is no new fragment in the received graft', () => {
          const prevState = {
            '/foo': {
              data: {
                a: { b: { c: {} } },
                d: { e: { f: {} } },
              },
              fragments: { header: ['data.d.e.f'] },
              flashes: []
            },
          }

          const receivedPage = {
            data: {},
            path: 'data.a.b.c',
            fragments: {},
            flashes: []
          }

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })

          expect(nextState).toEqual(nextState)
        })
      })

      describe('grafting a received node onto the page', () => {
        it('returns the state when pathToNode is empty', () => {
          const prevState = {
            '/foo': {
              data: { a: { b: { c: {} } } },
              fragments: {},
              flashes: [],
            },
          }
          const receivedPage = {
            data: { foo: 1 },
            fragments: {},
            flashes: [],
          }
          const pageKey = '/foo'

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })
          expect(nextState).toEqual(prevState)
        })

        it('grafts a received node onto the current page', () => {
          const pageKey = '/foo'
          const prevState = {
            '/foo': {
              data: { a: { b: { c: {} } } },
              fragments: {},
              flashes: [],
            },
          }

          const receivedPage = {
            data: { foo: 1 },
            path: 'data.a.b.c',
            fragments: {},
            flashes: [],
          }

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })

          expect(nextState).toEqual({
            '/foo': {
              data: { a: { b: { c: { foo: 1 } } } },
              fragments: {},
              flashes: []
            },
          })
        })

        it('throws cant find page if the page does not exist for grafting', () => {
          const prevState = {}

          const receivedPage = {
            data: { foo: 1 },
            path: 'data.a.b.c',
          }

          expect(() => {
            pageReducer(prevState, {
              type: '@@breezy/HANDLE_GRAFT',
              payload: {
                pageKey: '/foo',
                page: receivedPage,
              },
            })
          }).toThrow(
            new Error(
              'Breezy was looking for /foo in your state, but could not find it in your mapping. Did you forget to pass in a valid pageKey to this.props.remote or this.props.visit?'
            )
          )
        })

        it('does not mutate the state when search results are empty', () => {
          spyOn(console, 'warn')

          const prevState = {
            '/foo': {
              data: { a: { b: { c: {} } } },
              fragments: {},
              flashes: [],
            },
          }

          const receivedPage = {
            path: 'data.a.b.c',
            flashes: [],
          }

          const nextState = pageReducer(prevState, {
            type: '@@breezy/HANDLE_GRAFT',
            payload: {
              pageKey: '/foo',
              page: receivedPage,
            },
          })

          expect(console.warn).toHaveBeenCalledWith(
            'There was no node returned in the response. Do you have the correct key path in your bzq?'
          )
          expect(nextState).toEqual(prevState)
        })
      })
    })

    describe('BREEZY_SAVE_RESPONSE', () => {
      it('saves page', () => {
        const prevState = {}
        const nextState = pageReducer(prevState, {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: {
              data: {},
              csrfToken: 'token',
              assets: ['application-123.js'],
            },
          },
        })

        expect(nextState['/foo']).toEqual(
          jasmine.objectContaining({
            data: {},
            csrfToken: 'token',
            assets: ['application-123.js'],
            pageKey: '/foo',
            fragments: {},
          })
        )
      })

      it('uses existing deferred nodes as placeholders when there is already a page in the store', () => {
        const prevState = {
          '/foo': {
            data: {
              foo: {
                bar: {
                  greetings: 'hello world',
                },
              },
            },
            pageKey: '/foo',
            defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
            fragments: {},
          },
        }

        const receivedPage = {
          data: {
            foo: {
              baz: { name: 'john' },
              bar: {},
            },
          },
          defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
          fragments: {},
        }

        const nextState = pageReducer(prevState, {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: receivedPage,
          },
        })

        expect(nextState['/foo']).toEqual({
          data: {
            foo: {
              baz: { name: 'john' },
              bar: {
                greetings: 'hello world',
              },
            },
          },
          pageKey: '/foo',
          defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
          fragments: {},
        })
      })

      it('uses existing fragment nodes as placeholders for deferred fragments', () => {
        const prevState = {
          '/bar': {
            data: {
              foo: {
                bar: {
                  greetings: 'hello world',
                },
              },
            },
            pageKey: '/bar',
            defers: [{ url: '/bar?bzq=data.foo.bar', path: 'data.foo.bar' }],
            fragments: {
              info: ['data.foo.bar'],
            },
          },
        }

        const receivedPage = {
          data: {
            foo: {
              bar: {},
            },
          },
          defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
          fragments: {
            info: ['data.foo.bar'],
          },
        }

        const nextState = pageReducer(prevState, {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: receivedPage,
          },
        })

        expect(nextState['/foo']).toEqual({
          data: {
            foo: {
              bar: {
                greetings: 'hello world',
              },
            },
          },
          pageKey: '/foo',
          defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
          fragments: {
            info: ['data.foo.bar'],
          },
        })
      })

      it('does nothing when there are no prev fragments to use as placeholder', () => {
        const prevState = {
          '/bar': {
            data: {
              foo: {
                bar: {
                  greetings: 'hello world',
                },
              },
            },
            pageKey: '/bar',
            defers: [{ url: '/bar?bzq=data.foo.bar', path: 'data.foo.bar' }],
            fragments: {},
          },
        }

        const receivedPage = {
          data: {
            foo: {
              bar: {},
            },
          },
          defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
          fragments: {
            info: ['data.foo.bar'],
          },
        }

        const nextState = pageReducer(prevState, {
          type: '@@breezy/SAVE_RESPONSE',
          payload: {
            pageKey: '/foo',
            page: receivedPage,
          },
        })

        expect(nextState['/foo']).toEqual({
          data: {
            foo: {
              bar: {},
            },
          },
          pageKey: '/foo',
          defers: [{ url: '/foo?bzq=data.foo.bar', path: 'data.foo.bar' }],
          fragments: {
            info: ['data.foo.bar'],
          },
        })
      })
    })

    describe('BREEZY_UPDATE_ALL_FRAGMENTS', () => {
      it('updates all fragments using a map of names to node', () => {
        const prevState = {
          '/foo': {
            data: {
              header: {
                cart: {
                  total: 30,
                },
              },
            },
            csrfToken: 'token',
            assets: ['application-123.js'],
            fragments: {
              info: ['data.header.cart'],
            },
          },
        }

        const nextState = pageReducer(prevState, {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {
              info: {
                total: 10,
              },
            },
          },
        })

        const nextStateCartTotal = nextState['/foo'].data.header.cart.total
        expect(nextStateCartTotal).toEqual(10)
      })

      it('skips over pages without any fragments', () => {
        const prevState = {
          '/foo': {
            data: {
              header: {
                cart: {
                  total: 30,
                },
              },
            },
            csrfToken: 'token',
            assets: ['application-123.js'],
            fragments: {
              info: ['data.header.cart'],
            },
          },
          '/bar': {
            data: {},
            csrfToken: 'token',
            assets: ['application-123.js'],
            fragments: {},
          },
        }

        const nextState = pageReducer(prevState, {
          type: '@@breezy/UPDATE_ALL_FRAGMENTS',
          payload: {
            fragments: {
              info: {
                total: 10,
              },
            },
          },
        })

        const skippedPage = nextState['/bar'].data
        expect(skippedPage).toEqual({})

        const nextStateCartTotal = nextState['/foo'].data.header.cart.total
        expect(nextStateCartTotal).toEqual(10)
      })
    })
  })
})
