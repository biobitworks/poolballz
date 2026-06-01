import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

const localStorageMock = (() => {
  let store = {};

  return {
    clear() {
      store = {};
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    removeItem(key) {
      delete store[key];
    },
    setItem(key, value) {
      store[key] = String(value);
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

afterEach(() => {
  cleanup();
});
