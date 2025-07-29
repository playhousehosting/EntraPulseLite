// Artifact types for Claude-style code and content rendering
// Similar to Claude.ai's artifact system

export type ArtifactType = 
  | 'text/markdown'
  | 'text/html' 
  | 'text/css'
  | 'text/javascript'
  | 'application/react'
  | 'text/python'
  | 'text/sql'
  | 'application/json'
  | 'text/yaml'
  | 'image/svg+xml'
  | 'application/streamlit'
  | 'application/nextjs'
  | 'application/webapp'
  | 'application/dashboard';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string; // Programming language for syntax highlighting
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    dependencies?: string[];
    version?: string;
    author?: string;
    tags?: string[];
    size?: number;
  };
}

export interface ArtifactMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  timestamp: Date;
}

export interface ArtifactRenderer {
  canRender: (type: ArtifactType) => boolean;
  render: (artifact: Artifact) => React.ReactElement;
  preview?: (artifact: Artifact) => string;
}

export interface ArtifactExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  logs?: string[];
  executionTime?: number;
}

export interface WebAppConfig {
  framework: 'streamlit' | 'html' | 'react' | 'nextjs';
  title: string;
  description?: string;
  features: string[];
  dataSource?: {
    type: 'json' | 'csv' | 'api' | 'database';
    content?: string;
    url?: string;
    headers?: Record<string, string>;
  };
  styling?: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    customCSS?: string;
  };
  components: WebAppComponent[];
}

export interface WebAppComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'input' | 'filter' | 'map' | 'form';
  title?: string;
  config: Record<string, any>;
  data?: any;
  position?: { x: number; y: number; width: number; height: number };
}

export interface WebAppTemplate {
  id: string;
  name: string;
  description: string;
  framework: 'streamlit' | 'html' | 'react' | 'nextjs';
  category: 'dashboard' | 'form' | 'visualization' | 'report' | 'app';
  template: string;
  requiredData?: string[];
  features: string[];
  preview?: string;
}

export interface WebAppGenerationRequest {
  data: any;
  config: WebAppConfig;
  template?: string;
  customizations?: Record<string, any>;
}