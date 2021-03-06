import Vue from 'vue';
import Vuex from 'vuex';
import VuexPersistence from 'vuex-persist';
import cards from './cards';
import settings from './settings';
import cache from './cache';
import cardsSettings from './cards_settings';

window.browser = require('webextension-polyfill');

if (window.__PRERENDER_INJECTED) {
  window.browser = {
    storage: {
      sync: {
        get: () => Promise.resolve({ vuex: '{"settings":{"tutorial":true}}' }),
      },
      local: {
        get: () => Promise.resolve({}),
      },
    },
    identity: {
      getRedirectURL: () => '',
    },
  };
}

Vue.use(Vuex);

const restoreState = (key, storage) => new Promise((resolve) => {
  storage
    .getItem(key)
    .then((data) => {
      if (data) resolve(JSON.parse(data));
      else resolve();
      document.dispatchEvent(new Event('storageReady'));
    });
});

const vuexSync = new VuexPersistence({
  strictMode: false,
  asyncStorage: true,
  modules: ['settings', 'cards', 'cardsSettings'],
  storage: {
    getItem: key => browser.storage.sync.get(key).then(data => data[key]),
    setItem: (key, value) => browser.storage.sync.set({ [key]: value }),
    removeItem: key => browser.storage.sync.remove(key),
    clear: () => browser.storage.sync.clear(),
  },
  restoreState,
});

const vuexLocal = new VuexPersistence({
  strictMode: false,
  asyncStorage: true,
  modules: ['cache'],
  storage: {
    getItem: key => browser.storage.local.get(key).then(data => data[key]),
    setItem: (key, value) => browser.storage.local.set({ [key]: value }),
    removeItem: key => browser.storage.local.remove(key),
    clear: () => browser.storage.local.clear(),
  },
  restoreState,
});

const vuexPersistEmitter = (store) => {
  /* eslint-disable no-param-reassign */
  store._vm.$root.$data['vuex-persit-wait'] = 0;
  document.addEventListener('storageReady', () => {
    store._vm.$root.$data['vuex-persit-wait'] += 1;
    if (store._vm.$root.$data['vuex-persit-wait'] === 2) {
      store._vm.$root.$emit('storageReady');
    }
  }, false);
  /* eslint-enable no-param-reassign */
};

export default new Vuex.Store({
  modules: {
    cards,
    settings,
    cardsSettings,
    cache,
  },
  plugins: [
    vuexSync.plugin,
    vuexLocal.plugin,
    vuexPersistEmitter,
  ],
});
