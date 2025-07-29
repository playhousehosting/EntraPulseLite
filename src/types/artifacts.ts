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
  | 'image/svg+xml';

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