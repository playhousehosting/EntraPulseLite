// Integration Hub Component Tests
// Tests for MCP marketplace, workflow builder, and API management functionality

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

// Mock the services
jest.mock('../../renderer/services/MCPService');
jest.mock('../../renderer/services/WorkflowService');

const mockTheme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('Integration Hub Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const mockMCPService = {
      getMarketplace: jest.fn().mockResolvedValue([
        {
          server: {
            id: 'test-server',
            name: 'Test Server',
            description: 'A test MCP server',
            category: 'Analytics',
            version: '1.0.0',
            author: 'Test Author',
            status: 'Available',
            permissions: [],
            dependencies: [],
            config: {}
          },
          description: 'Test server description',
          featured: true,
          rating: 4.5,
          downloads: 1000,
          tags: ['test', 'demo'],
          screenshots: [],
          changelog: [],
          documentation: '',
          support: { email: 'test@example.com' },
          pricing: { type: 'free' },
          installation: { automated: true, manual: false }
        }
      ]),
      searchMarketplace: jest.fn(),
      getFeaturedServers: jest.fn(),
      installServer: jest.fn(),
      getCategories: jest.fn().mockReturnValue(['Analytics', 'Security', 'Productivity']),
      getInstalledServers: jest.fn().mockResolvedValue([]),
      on: jest.fn(),
      off: jest.fn()
    };

    beforeEach(() => {
      (MCPService.getInstance as jest.Mock).mockReturnValue(mockMCPService);
    });

    it('renders marketplace with server list', async () => {
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        expect(screen.getByText('MCP Server Marketplace')).toBeInTheDocument();
        expect(screen.getByText('Test Server')).toBeInTheDocument();
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
      
      expect(mockMCPService.searchMarketplace).toHaveBeenCalledWith('', 'Analytics');
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
      
      expect(mockMCPService.installServer).toHaveBeenCalledWith('test-server', {});
    });
  });

  describe('WorkflowBuilder Component', () => {
    const mockWorkflowService = {
      getWorkflows: jest.fn().mockResolvedValue([]),
      getWorkflowTemplates: jest.fn().mockResolvedValue([
        {
          id: 'template-1',
          name: 'User Onboarding',
          description: 'Automated user onboarding workflow',
          category: 'Automation',
          tags: ['user', 'onboarding'],
          nodes: [],
          connections: [],
          triggers: [],
          variables: [],
          created: new Date(),
          modified: new Date(),
          author: 'System',
          isActive: false,
          isTemplate: true,
          version: '1.0.0',
          permissions: [],
          metadata: {}
        }
      ]),
      createWorkflow: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    beforeEach(() => {
      (WorkflowService.getInstance as jest.Mock).mockReturnValue(mockWorkflowService);
    });

    it('renders workflow builder interface', () => {
      renderWithTheme(<WorkflowBuilder />);
      
      expect(screen.getByText('Visual Workflow Builder')).toBeInTheDocument();
      expect(screen.getByText('My Workflows')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    it('displays workflow templates', async () => {
      renderWithTheme(<WorkflowBuilder />);
      
      await waitFor(() => {
        expect(screen.getByText('User Onboarding')).toBeInTheDocument();
      });
    });

    it('allows creating new workflow', async () => {
      const user = userEvent.setup();
      renderWithTheme(<WorkflowBuilder />);
      
      const createButton = screen.getByText('Create New Workflow');
      await user.click(createButton);
      
      expect(screen.getByText('Create New Workflow')).toBeInTheDocument();
    });

    it('shows workflow canvas', () => {
      renderWithTheme(<WorkflowBuilder />);
      
      expect(screen.getByText('Drop workflow components here')).toBeInTheDocument();
    });
  });

  describe('APIManagementConsole Component', () => {
    it('renders API management interface', () => {
      renderWithTheme(<APIManagementConsole />);
      
      expect(screen.getByText('API Management Console')).toBeInTheDocument();
      expect(screen.getByText('Active Connections')).toBeInTheDocument();
      expect(screen.getByText('Connection Health')).toBeInTheDocument();
    });

    it('displays connection metrics', () => {
      renderWithTheme(<APIManagementConsole />);
      
      expect(screen.getByText('Total Connections')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('API Calls (24h)')).toBeInTheDocument();
    });

    it('shows API endpoints list', () => {
      renderWithTheme(<APIManagementConsole />);
      
      expect(screen.getByText('API Endpoints')).toBeInTheDocument();
    });

    it('allows adding new connection', async () => {
      const user = userEvent.setup();
      renderWithTheme(<APIManagementConsole />);
      
      const addButton = screen.getByText('Add Connection');
      await user.click(addButton);
      
      expect(screen.getByText('Add New API Connection')).toBeInTheDocument();
    });
  });

  describe('Service Integration Tests', () => {
    it('MCPService initializes correctly', () => {
      const service = MCPService.getInstance();
      expect(service).toBeDefined();
    });

    it('WorkflowService initializes correctly', () => {
      const service = WorkflowService.getInstance();
      expect(service).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles marketplace loading errors gracefully', async () => {
      const mockMCPService = {
        getMarketplace: jest.fn().mockRejectedValue(new Error('Network error')),
        on: jest.fn(),
        off: jest.fn()
      };
      
      (MCPService.getInstance as jest.Mock).mockReturnValue(mockMCPService);
      
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load marketplace')).toBeInTheDocument();
      });
    });

    it('handles workflow loading errors gracefully', async () => {
      const mockWorkflowService = {
        getWorkflows: jest.fn().mockRejectedValue(new Error('Database error')),
        getWorkflowTemplates: jest.fn().mockRejectedValue(new Error('Template error')),
        on: jest.fn(),
        off: jest.fn()
      };
      
      (WorkflowService.getInstance as jest.Mock).mockReturnValue(mockWorkflowService);
      
      renderWithTheme(<WorkflowBuilder />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load workflows')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    it('renders marketplace quickly with many servers', async () => {
      const manyServers = Array.from({ length: 100 }, (_, i) => ({
        server: {
          id: `server-${i}`,
          name: `Server ${i}`,
          description: `Description ${i}`,
          category: 'Analytics',
          version: '1.0.0',
          author: 'Test Author',
          status: 'Available',
          permissions: [],
          dependencies: [],
          config: {}
        },
        description: `Description ${i}`,
        featured: i < 5,
        rating: 4.0 + Math.random(),
        downloads: Math.floor(Math.random() * 10000),
        tags: ['test'],
        screenshots: [],
        changelog: [],
        documentation: '',
        support: { email: 'test@example.com' },
        pricing: { type: 'free' },
        installation: { automated: true, manual: false }
      }));

      const mockMCPService = {
        getMarketplace: jest.fn().mockResolvedValue(manyServers),
        searchMarketplace: jest.fn(),
        getFeaturedServers: jest.fn(),
        getCategories: jest.fn().mockReturnValue(['Analytics']),
        getInstalledServers: jest.fn().mockResolvedValue([]),
        on: jest.fn(),
        off: jest.fn()
      };

      (MCPService.getInstance as jest.Mock).mockReturnValue(mockMCPService);

      const startTime = performance.now();
      renderWithTheme(<IntegrationMarketplace />);
      
      await waitFor(() => {
        expect(screen.getByText('Server 0')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should render within 5 seconds
    });
  });
});