// Initial state
const internalSharedData = {
  openInEditorHost: '/',
  classifyComponents: true,
  theme: 'auto',
  displayDensity: 'low',
  recordVuex: true,
  cacheVuexSnapshotsEvery: 50,
  cacheVuexSnapshotsLimit: 10,
  snapshotLoading: null,
  recordPerf: false,
  editableProps: false
}

const persisted = [
  'classifyComponents',
  'theme',
  'displayDensity',
  'recordVuex',
  'editableProps'
]

// ---- INTERNALS ---- //

let Vue
let bridge
// Storage API
let storage = null
// List of fields to persist to storage (disabled if 'false')
// This should be unique to each shared data client to prevent conflicts
let persist = false
// For reactivity, we wrap the data in a Vue instance
let vm

export function init (params) {
  // Mandatory params
  bridge = params.bridge
  Vue = params.Vue

  if (params.hasOwnProperty('storage')) {
    storage = params.storage
    persist = persisted
  }

  // Load persisted fields
  if (persist) {
    persist.forEach(key => {
      const value = storage.get(`shared-data:${key}`)
      if (value !== null) {
        internalSharedData[key] = value
        // Send to other shared data clients
        sendValue(key, value)
      }
    })
  }

  // Wrapper Vue instance
  vm = new Vue({
    data: internalSharedData
  })

  // Update value from other shared data clients
  bridge.on('shared-data:set', ({ key, value }) => {
    setValue(key, value)
  })
}

export function destroy () {
  bridge.removeAllListeners('shared-data:set')
  vm.$destroy()
}

function setValue (key, value) {
  // Storage
  if (persist && persist.includes(key)) {
    storage.set(`shared-data:${key}`, value)
  }
  vm[key] = value
  // Validate Proxy set trap
  return true
}

function sendValue (key, value) {
  bridge && bridge.send('shared-data:set', {
    key,
    value
  })
}

export function watch (...args) {
  vm.$watch(...args)
}

const proxy = {}
Object.keys(internalSharedData).forEach(key => {
  Object.defineProperty(proxy, key, {
    configurable: false,
    get: () => vm && vm.$data[key],
    set: (value) => {
      sendValue(key, value)
      setValue(key, value)
    }
  })
})

export default proxy
