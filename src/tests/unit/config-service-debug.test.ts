// Debug test to isolate the mocking issue

// Mock electron-store BEFORE any imports
const mockStoreInstance = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  size: 0,
  store: {}
};

const mockStoreConstructor = jest.fn().mockImplementation((config) => {
  console.log('Mock Store constructor called with:', config);
  return mockStoreInstance;
});

// Clear any existing module cache for electron-store and ConfigService
jest.resetModules();

// Mock electron-store BEFORE requiring ConfigService
jest.mock('electron-store', () => mockStoreConstructor);

describe('ConfigService Debug Test', () => {
  test('should use mocked electron-store', async () => {
    // Setup default mock behavior
    mockStoreInstance.get.mockImplementation((key: string) => {
      console.log('Mock get called with:', key);
      const defaults: any = {
        currentAuthMode: 'client-credentials',
        currentUserKey: undefined
      };
      return defaults[key];
    });

    // Import ConfigService AFTER setting up the mock
    const { ConfigService } = await import('../../shared/ConfigService');
    
    console.log('Creating ConfigService instance...');
    const configService = new ConfigService();
    
    console.log('Mock Store constructor calls:', mockStoreConstructor.mock.calls.length);
    console.log('Mock Store constructor calls:', mockStoreConstructor.mock.calls);
    
    // Clear mocks after constructor
    jest.clearAllMocks();
    
    console.log('Calling setAuthenticationContext...');
    configService.setAuthenticationContext('client-credentials');
    
    console.log('Mock set calls:', mockStoreInstance.set.mock.calls.length);
    console.log('Mock set calls:', mockStoreInstance.set.mock.calls);
    
    expect(mockStoreInstance.set).toHaveBeenCalledWith('currentAuthMode', 'client-credentials');
  });
});
