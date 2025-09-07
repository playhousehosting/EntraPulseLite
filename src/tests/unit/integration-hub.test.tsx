// Integration Hub Component Tests
// Tests for MCP marketplace, workflow builder, and API management functionality
// 
// IMPORTANT: This test file uses completely isolated mock data and prevents all real API calls
// No production data or real service endpoints are used in these tests

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { IntegrationHub } from '../../renderer/components/IntegrationMarketplace/IntegrationHub';
import { IntegrationMarketplace } from '../../renderer/components/IntegrationMarketplace/IntegrationMarketplace';
import { WorkflowBuilder } from '../../renderer/components/IntegrationMarketplace/WorkflowBuilder';
import { APIManagementConsole } from '../../renderer/components/IntegrationMarketplace/APIManagementConsole';
import { MCPService } from '../../renderer/services/MCPService';
import { WorkflowService } from '../../renderer/services/WorkflowService';

// Ensure we're in test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('This test file should only run in test environment');
}

// Mock the services completely to prevent any real API calls
jest.mock('../../renderer/services/MCPService', () => {
  return {
    MCPService: jest.fn().mockImplementation(() => ({
      getMarketplace: jest.fn().mockResolvedValue([]),
      searchMarketplace: jest.fn().mockResolvedValue([]),
      getFeaturedServers: jest.fn().mockResolvedValue([]),
      installServer: jest.fn().mockResolvedValue(false),
      getCategories: jest.fn().mockReturnValue([]),
      getInstalledServers: jest.fn().mockResolvedValue([]),
      getConnections: jest.fn().mockResolvedValue([]),
      startServer: jest.fn().mockResolvedValue(false),
      stopServer: jest.fn().mockResolvedValue(false),
      testConnection: jest.fn().mockResolvedValue(false),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      cleanup: jest.fn()
    }))
  };
});

jest.mock('../../renderer/services/WorkflowService', () => {
  return {
    WorkflowService: jest.fn().mockImplementation(() => ({
      getWorkflows: jest.fn().mockResolvedValue([]),
      getWorkflowTemplates: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockResolvedValue('mock-workflow-id'),
      executeWorkflow: jest.fn().mockResolvedValue('mock-execution-id'),
      getTemplates: jest.fn().mockResolvedValue([]),
      getNodeTypes: jest.fn().mockResolvedValue([]),
      validateWorkflow: jest.fn().mockResolvedValue({ isValid: true, errors: [] }),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      cleanup: jest.fn()
    }))
  };
});

// Mock window.electronAPI to prevent any IPC calls
const mockElectronAPI = {
  mcp: {
    getMarketplace: jest.fn().mockResolvedValue({ success: false, data: [] }),
    getInstalledServers: jest.fn().mockResolvedValue({ success: false, data: [] }),
    getActiveConnections: jest.fn().mockResolvedValue({ success: false, data: [] }),
    installServer: jest.fn().mockResolvedValue({ success: false }),
    uninstallServer: jest.fn().mockResolvedValue({ success: false }),
    startServer: jest.fn().mockResolvedValue({ success: false }),
    stopServer: jest.fn().mockResolvedValue({ success: false }),
    testConnection: jest.fn().mockResolvedValue({ success: false }),
    sendMessage: jest.fn().mockResolvedValue({ success: false }),
    updateServerConfig: jest.fn().mockResolvedValue({ success: false })
  },
  workflow: {
    getWorkflows: jest.fn().mockResolvedValue({ success: false, data: [] }),
    getTemplates: jest.fn().mockResolvedValue({ success: false, data: [] }),
    getNodeTypes: jest.fn().mockResolvedValue({ success: false, data: [] }),
    getRecentExecutions: jest.fn().mockResolvedValue({ success: false, data: [] }),
    saveWorkflow: jest.fn().mockResolvedValue({ success: false }),
    deleteWorkflow: jest.fn().mockResolvedValue({ success: false }),
    executeWorkflow: jest.fn().mockResolvedValue({ success: false }),
    cancelExecution: jest.fn().mockResolvedValue({ success: false }),
    scheduleWorkflow: jest.fn().mockResolvedValue({ success: false })
  }
};

// Override window.electronAPI in test environment
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true
});

// Create mock implementations
const MockMCPService = MCPService as jest.MockedClass<typeof MCPService>;
const MockWorkflowService = WorkflowService as jest.MockedClass<typeof WorkflowService>;

const mockTheme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('Integration Hub Tests', () => {
  // Ensure clean state before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock implementations to prevent test interference
    jest.resetAllMocks();
    
    // Ensure window.electronAPI is properly mocked
    if (window.electronAPI) {
      Object.keys(mockElectronAPI.mcp).forEach(key => {
        jest.clearAllMocks();
      });
      Object.keys(mockElectronAPI.workflow).forEach(key => {
        jest.clearAllMocks();
      });
    }
  });

  // Clean up after each test
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Ensure no real network calls can be made
  beforeAll(() => {
    // Mock fetch to prevent any accidental network calls
    global.fetch = jest.fn().mockRejectedValue(new Error('Network calls are not allowed in tests'));
    
    // Mock XMLHttpRequest
    const mockXHR = {
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      readyState: 4,
      status: 200,
      response: JSON.stringify({ error: 'Network calls are not allowed in tests' })
    };
    (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
    
    // Validate that we're using mock data by checking for test markers
    const validateMockData = (data: any, context: string) => {
      if (typeof data === 'object' && data !== null) {
        const str = JSON.stringify(data).toLowerCase();
        if (!str.includes('test') && !str.includes('mock') && !str.includes('do_not_use')) {
          console.warn(`⚠️  WARNING: ${context} might contain real data. All test data should be clearly marked.`);
        }
      }
    };
    
    // Add global validation hook
    (global as any).__validateTestData = validateMockData;
  });

  afterAll(() => {
    // Restore original implementations
    jest.restoreAllMocks();
    if (global.fetch && jest.isMockFunction(global.fetch)) {
      (global.fetch as jest.Mock).mockRestore();
    }
  });

  describe('IntegrationHub Component', () => {
    const mockProps = {
      onNavigateToMarketplace: jest.fn(),
      onNavigateToWorkflows: jest.fn(),
      onNavigateToAPIs: jest.fn(),
    };

    it('renders integration hub with all tabs', () => {
      renderWithTheme(<IntegrationHub {...mockProps} />);
      
      expect(screen.getByText('Integration Hub')).toBeInTheDocument();
      expect(screen.getByText('Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Workflow Builder')).toBeInTheDocument();
      expect(screen.getByText('API Management')).toBeInTheDocument();
      expect(screen.getByText('Installed Servers')).toBeInTheDocument();
    });

    it('displays integration statistics', () => {
      renderWithTheme(<IntegrationHub {...mockProps} />);
      
      expect(screen.getByText('0')).toBeInTheDocument(); // Active Integrations
      expect(screen.getByText('0')).toBeInTheDocument(); // Running Workflows
      expect(screen.getByText('0')).toBeInTheDocument(); // API Calls Today
    });

    it('allows tab navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<IntegrationHub {...mockProps} />);
      
      const workflowTab = screen.getByText('Workflow Builder');
      await user.click(workflowTab);
      
      expect(screen.getByText('Visual Workflow Builder')).toBeInTheDocument();
    });

    it('shows notifications panel', () => {
      renderWithTheme(<IntegrationHub {...mockProps} />);
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  describe('IntegrationMarketplace Component', () => {
    // Create isolated mock data that clearly indicates it's for testing only
    const mockMCPService = {
      getMarketplace: jest.fn().mockResolvedValue([
        {
          id: 'TEST_ONLY_SERVER_DO_NOT_USE_IN_PRODUCTION',
          server: {
            id: 'TEST_ONLY_SERVER_DO_NOT_USE_IN_PRODUCTION',
            name: '[TEST] Mock Server',
            description: 'This is a mock server for testing purposes only',
            category: 'Analytics',
            version: '0.0.0-test',
            author: 'Test Suite',
            status: 'Available',
            endpoint: 'mock://test-only',
            capabilities: ['test-only'],
            permissions: [],
            dependencies: [],
            config: { testOnly: true },
            lastUpdated: new Date('2000-01-01'),
            isOfficial: false,
            rating: 0,
            downloads: 0,
            resources: [],
            tools: []
          },
          screenshots: [],
          documentation: 'Test documentation - not for production use',
          supportUrl: 'mock://test-support',
          licenseType: 'MIT' as const,
          pricing: { type: 'Free' as const },
          reviews: [],
          tags: ['test', 'mock', 'do-not-use-in-production'],
          featured: false
        }
      ]),
      searchMarketplace: jest.fn().mockResolvedValue([]),
      getFeaturedServers: jest.fn().mockResolvedValue([]),
      installServer: jest.fn().mockResolvedValue(false), // Always fail in tests
      getCategories: jest.fn().mockReturnValue(['TEST_CATEGORY_ONLY']),
      getInstalledServers: jest.fn().mockResolvedValue([]),
      getConnections: jest.fn().mockResolvedValue([]),
      startServer: jest.fn().mockResolvedValue(false),
      stopServer: jest.fn().mockResolvedValue(false),
      testConnection: jest.fn().mockResolvedValue(false),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      cleanup: jest.fn()
    };

    beforeEach(() => {
      // Override the mock implementation with isolated test data
      MockMCPService.mockImplementation(() => mockMCPService as any);
      
      // Ensure no real API calls can be made
      mockMCPService.getMarketplace.mockClear();
      mockMCPService.searchMarketplace.mockClear();
      mockMCPService.installServer.mockClear();
    });

    it('renders marketplace with server list', async () => {
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        expect(screen.getByText('MCP Server Marketplace')).toBeInTheDocument();
        expect(screen.getByText('[TEST] Mock Server')).toBeInTheDocument();
      });
    });

    it('allows searching for servers', async () => {
      const user = userEvent.setup();
      renderWithTheme(<IntegrationMarketplace />);
      
      const searchInput = screen.getByPlaceholderText(/search servers/i);
      await user.type(searchInput, 'test');
      
      expect(mockMCPService.searchMarketplace).toHaveBeenCalledWith('test', '');
    });

    it('filters by category', async () => {
      const user = userEvent.setup();
      renderWithTheme(<IntegrationMarketplace />);
      
      const categoryFilter = screen.getByText('All Categories');
      await user.click(categoryFilter);
      
      const analyticsOption = screen.getByText('Analytics');
      await user.click(analyticsOption);
      
      expect(mockMCPService.searchMarketplace).toHaveBeenCalledWith('', 'TEST_CATEGORY_ONLY');
    });

    it('handles server installation', async () => {
      const user = userEvent.setup();
      mockMCPService.installServer.mockResolvedValue(true);
      
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        const installButton = screen.getByText('Install');
        expect(installButton).toBeInTheDocument();
      });
      
      const installButton = screen.getByText('Install');
      await user.click(installButton);
      
      expect(mockMCPService.installServer).toHaveBeenCalledWith('TEST_ONLY_SERVER_DO_NOT_USE_IN_PRODUCTION', {});
    });
  });

  describe('WorkflowBuilder Component', () => {
    // Create isolated mock data that clearly indicates it's for testing only
    const mockWorkflowService = {
      getWorkflows: jest.fn().mockResolvedValue([]),
      getWorkflowTemplates: jest.fn().mockResolvedValue([
        {
          id: 'TEST_ONLY_TEMPLATE_DO_NOT_USE_IN_PRODUCTION',
          name: '[TEST] Mock User Onboarding',
          description: 'This is a mock workflow template for testing purposes only',
          category: 'TEST_AUTOMATION',
          tags: ['test', 'mock', 'do-not-use-in-production'],
          nodes: [],
          connections: [],
          triggers: [],
          variables: [],
          created: new Date('2000-01-01'),
          modified: new Date('2000-01-01'),
          author: 'Test Suite',
          isActive: false,
          isTemplate: true,
          version: '0.0.0-test',
          permissions: [],
          metadata: { testOnly: true }
        }
      ]),
      createWorkflow: jest.fn().mockResolvedValue('TEST_WORKFLOW_ID_DO_NOT_USE'),
      executeWorkflow: jest.fn().mockResolvedValue('TEST_EXECUTION_ID_DO_NOT_USE'),
      getTemplates: jest.fn().mockResolvedValue([]),
      getNodeTypes: jest.fn().mockResolvedValue([]),
      validateWorkflow: jest.fn().mockResolvedValue({ isValid: false, errors: ['Test mode - validation disabled'] }),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      cleanup: jest.fn()
    };

    beforeEach(() => {
      // Override the mock implementation with isolated test data
      MockWorkflowService.mockImplementation(() => mockWorkflowService as any);
      
      // Ensure no real API calls can be made
      mockWorkflowService.getWorkflows.mockClear();
      mockWorkflowService.getWorkflowTemplates.mockClear();
      mockWorkflowService.createWorkflow.mockClear();
    });

    it('renders workflow builder interface', () => {
      const mockProps = {
        onSave: jest.fn(),
        onExecute: jest.fn(),
        onClose: jest.fn()
      };
      renderWithTheme(<WorkflowBuilder {...mockProps} />);
      
      expect(screen.getByText('Visual Workflow Builder')).toBeInTheDocument();
      expect(screen.getByText('My Workflows')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    it('displays workflow templates', async () => {
      const mockProps = {
        onSave: jest.fn(),
        onExecute: jest.fn(),
        onClose: jest.fn()
      };
      renderWithTheme(<WorkflowBuilder {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('[TEST] Mock User Onboarding')).toBeInTheDocument();
      });
    });

    it('allows creating new workflow', async () => {
      const user = userEvent.setup();
      const mockProps = {
        onSave: jest.fn(),
        onExecute: jest.fn(),
        onClose: jest.fn()
      };
      renderWithTheme(<WorkflowBuilder {...mockProps} />);
      
      const createButton = screen.getByText('Create New Workflow');
      await user.click(createButton);
      
      expect(screen.getByText('Create New Workflow')).toBeInTheDocument();
    });

    it('shows workflow canvas', () => {
      const mockProps = {
        onSave: jest.fn(),
        onExecute: jest.fn(),
        onClose: jest.fn()
      };
      renderWithTheme(<WorkflowBuilder {...mockProps} />);
      
      expect(screen.getByText('Drop workflow components here')).toBeInTheDocument();
    });
  });

  describe('APIManagementConsole Component', () => {
    it('renders API management interface', () => {
      const mockProps = {
        connections: [],
        onCreateConnection: jest.fn(),
        onUpdateConnection: jest.fn(),
        onDeleteConnection: jest.fn(),
        onTestConnection: jest.fn(),
        onCallEndpoint: jest.fn()
      };
      renderWithTheme(<APIManagementConsole {...mockProps} />);
      
      expect(screen.getByText('API Management Console')).toBeInTheDocument();
      expect(screen.getByText('Active Connections')).toBeInTheDocument();
      expect(screen.getByText('Connection Health')).toBeInTheDocument();
    });

    it('displays connection metrics', () => {
      const mockProps = {
        connections: [],
        onCreateConnection: jest.fn(),
        onUpdateConnection: jest.fn(),
        onDeleteConnection: jest.fn(),
        onTestConnection: jest.fn(),
        onCallEndpoint: jest.fn()
      };
      renderWithTheme(<APIManagementConsole {...mockProps} />);
      
      expect(screen.getByText('Total Connections')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('API Calls (24h)')).toBeInTheDocument();
    });

    it('shows API endpoints list', () => {
      const mockProps = {
        connections: [],
        onCreateConnection: jest.fn(),
        onUpdateConnection: jest.fn(),
        onDeleteConnection: jest.fn(),
        onTestConnection: jest.fn(),
        onCallEndpoint: jest.fn()
      };
      renderWithTheme(<APIManagementConsole {...mockProps} />);
      
      expect(screen.getByText('API Endpoints')).toBeInTheDocument();
    });

    it('allows adding new connection', async () => {
      const user = userEvent.setup();
      const mockProps = {
        connections: [],
        onCreateConnection: jest.fn(),
        onUpdateConnection: jest.fn(),
        onDeleteConnection: jest.fn(),
        onTestConnection: jest.fn(),
        onCallEndpoint: jest.fn()
      };
      renderWithTheme(<APIManagementConsole {...mockProps} />);
      
      const addButton = screen.getByText('Add Connection');
      await user.click(addButton);
      
      expect(screen.getByText('Add New API Connection')).toBeInTheDocument();
    });
  });

  describe('Service Integration Tests', () => {
    it('MCPService initializes correctly', () => {
      const service = new MCPService();
      expect(service).toBeDefined();
    });

    it('WorkflowService initializes correctly', () => {
      const service = new WorkflowService();
      expect(service).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles marketplace loading errors gracefully', async () => {
      // Create a completely isolated mock that prevents any real API calls
      const isolatedMockMCPService = {
        getMarketplace: jest.fn().mockRejectedValue(new Error('[TEST] Simulated network error - no real API call made')),
        searchMarketplace: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        getFeaturedServers: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        installServer: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        getCategories: jest.fn().mockImplementation(() => { throw new Error('[TEST] No real API calls allowed'); }),
        getInstalledServers: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        cleanup: jest.fn()
      };
      
      MockMCPService.mockImplementation(() => isolatedMockMCPService as any);
      
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load marketplace')).toBeInTheDocument();
      });
    });

    it('handles workflow loading errors gracefully', async () => {
      // Create a completely isolated mock that prevents any real API calls
      const isolatedMockWorkflowService = {
        getWorkflows: jest.fn().mockRejectedValue(new Error('[TEST] Simulated database error - no real API call made')),
        getWorkflowTemplates: jest.fn().mockRejectedValue(new Error('[TEST] Simulated template error - no real API call made')),
        createWorkflow: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        executeWorkflow: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        getTemplates: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        getNodeTypes: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        validateWorkflow: jest.fn().mockRejectedValue(new Error('[TEST] No real API calls allowed')),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        cleanup: jest.fn()
      };
      
      MockWorkflowService.mockImplementation(() => isolatedMockWorkflowService as any);
      
      const mockProps = {
        onSave: jest.fn(),
        onExecute: jest.fn(),
        onClose: jest.fn()
      };
      renderWithTheme(<WorkflowBuilder {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load workflows')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    it('renders marketplace quickly with many servers', async () => {
      // Generate clearly marked test data that cannot be confused with real data
      const manyTestServers = Array.from({ length: 100 }, (_, i) => ({
        id: `TEST_ONLY_SERVER_${i}_DO_NOT_USE_IN_PRODUCTION`,
        server: {
          id: `TEST_ONLY_SERVER_${i}_DO_NOT_USE_IN_PRODUCTION`,
          name: `[TEST] Mock Server ${i}`,
          description: `Test server ${i} - for testing purposes only`,
          category: 'TEST_ANALYTICS' as const,
          version: '0.0.0-test',
          author: 'Test Suite',
          status: 'Available' as const,
          endpoint: `mock://test-server-${i}`,
          capabilities: ['test-only'],
          permissions: [],
          dependencies: [],
          config: { testOnly: true, serverId: i },
          lastUpdated: new Date('2000-01-01'),
          isOfficial: false,
          rating: 0,
          downloads: 0,
          resources: [],
          tools: []
        },
        screenshots: [],
        documentation: `Test documentation ${i} - not for production use`,
        supportUrl: `mock://test-support-${i}`,
        licenseType: 'MIT' as const,
        pricing: { type: 'Free' as const },
        reviews: [],
        tags: ['test', 'mock', 'do-not-use-in-production'],
        featured: false
      }));

      // Create isolated mock service for performance testing
      const isolatedPerformanceMockService = {
        getMarketplace: jest.fn().mockResolvedValue(manyTestServers),
        searchMarketplace: jest.fn().mockResolvedValue([]),
        getFeaturedServers: jest.fn().mockResolvedValue([]),
        getCategories: jest.fn().mockReturnValue(['TEST_ANALYTICS']),
        getInstalledServers: jest.fn().mockResolvedValue([]),
        installServer: jest.fn().mockResolvedValue(false), // Always fail in tests
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        cleanup: jest.fn()
      };

      MockMCPService.mockImplementation(() => isolatedPerformanceMockService as any);

      const startTime = performance.now();
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        expect(screen.getByText('[TEST] Mock Server 0')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should render within 5 seconds
    });
  });
});