// TypeScript mock for electron-store
class MockStore {
  private data: any = {};
  private defaults: any = {};

  constructor(options: any = {}) {
    this.data = {};
    this.defaults = options.defaults || {};
  }

  get(key?: string, defaultValue?: any): any {
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

  set(key: string | object, value?: any): void {
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

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
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

  clear(): void {
    this.data = {};
  }

  get size(): number {
    return Object.keys(this.data).length;
  }

  get store(): any {
    return { ...this.defaults, ...this.data };
  }

  set store(value: any) {
    this.data = { ...value };
  }

  onDidChange(key: string, callback: Function): Function {
    // Mock implementation - in real tests you might want to track this
    return () => {}; // Return unsubscribe function
  }

  onDidAnyChange(callback: Function): Function {
    // Mock implementation
    return () => {}; // Return unsubscribe function
  }

  openInEditor(): void {
    // Mock implementation
  }
}

// Export as default (for import Store from 'electron-store')
export default MockStore;

// Also export as named export (for import { Store } from 'electron-store')
export { MockStore as Store };
