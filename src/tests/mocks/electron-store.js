// Mock for electron-store
class MockStore {
  constructor(options = {}) {
    this.data = {};
    this.defaults = options.defaults || {};
  }

  get(key, defaultValue) {
    if (key === undefined) {
      return { ...this.defaults, ...this.data };
    }
    
    const keys = key.split('.');
    let current = { ...this.defaults, ...this.data };
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  set(key, value) {
    if (typeof key === 'object') {
      // Setting multiple values
      Object.assign(this.data, key);
      return;
    }
    
    const keys = key.split('.');
    let current = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    const keys = key.split('.');
    let current = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        return;
      }
      current = current[k];
    }
    
    delete current[keys[keys.length - 1]];
  }

  clear() {
    this.data = {};
  }

  get size() {
    return Object.keys(this.data).length;
  }

  get store() {
    return { ...this.defaults, ...this.data };
  }

  set store(value) {
    this.data = { ...value };
  }

  onDidChange(key, callback) {
    // Mock implementation - in real tests you might want to track this
    return () => {}; // Return unsubscribe function
  }

  onDidAnyChange(callback) {
    // Mock implementation
    return () => {}; // Return unsubscribe function
  }

  openInEditor() {
    // Mock implementation
  }
}

module.exports = MockStore;
module.exports.default = MockStore;

// Additional compatibility for ES modules
Object.defineProperty(module.exports, '__esModule', { value: true });
