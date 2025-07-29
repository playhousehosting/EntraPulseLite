// ArtifactViewer.tsx
// Claude-style artifact viewer with live preview and editing capabilities

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider
} from '@mui/material';
import {
  Code as CodeIcon,
  Visibility as PreviewIcon,
  PlayArrow as RunIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Artifact, ArtifactType } from '../../types/artifacts';

interface ArtifactViewerProps {
  artifact: Artifact;
  onUpdate?: (artifact: Artifact) => void;
  editable?: boolean;
  showControls?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  onUpdate,
  editable = false,
  showControls = true
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const previewRef = useRef<HTMLIFrameElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedContent(artifact.content);
  }, [artifact.content]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSave = () => {
    if (onUpdate && editedContent !== artifact.content) {
      const updatedArtifact = {
        ...artifact,
        content: editedContent,
        updatedAt: new Date()
      };
      onUpdate(updatedArtifact);
    }
    setIsEditing(false);
  };

  const handleDownload = () => {
    const extension = getFileExtension(artifact.type);
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      // Execute based on artifact type
      const result = await executeArtifact(artifact);
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const renderPreview = () => {
    switch (artifact.type) {
      case 'text/html':
        return (
          <iframe
            ref={previewRef}
            srcDoc={editedContent}
            style={{
              width: '100%',
              height: '400px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
            title={artifact.title}
          />
        );
      
      case 'application/react':
        return (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary" gutterBottom>
              React Component Preview (Static)
            </Typography>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {editedContent}
            </pre>
          </Box>
        );
      
      case 'image/svg+xml':
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: editedContent }} />
          </Box>
        );
      
      case 'text/markdown':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="textSecondary" gutterBottom>
              Markdown Preview
            </Typography>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              backgroundColor: '#f8f9fa',
              padding: '12px',
              borderRadius: '4px'
            }}>
              {editedContent}
            </pre>
          </Box>
        );
      
      default:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Preview not available for {artifact.type}
            </Typography>
          </Box>
        );
    }
  };

  const renderCodeEditor = () => (
    <Box sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip label={artifact.type} size="small" />
        {editable && (
          <Box>
            {isEditing ? (
              <>
                <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="small" onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
                  Save
                </Button>
              </>
            ) : (
              <Button size="small" startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </Box>
        )}
      </Box>
      
      <textarea
        ref={codeEditorRef}
        value={isEditing ? editedContent : artifact.content}
        onChange={(e) => setEditedContent(e.target.value)}
        readOnly={!isEditing}
        style={{
          flex: 1,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '13px',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          resize: 'none',
          backgroundColor: isEditing ? 'white' : '#f8f9fa'
        }}
      />
    </Box>
  );

  const renderExecutionResult = () => {
    if (!executionResult) return null;

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          Execution Result
        </Typography>
        {executionResult.success ? (
          <Box>
            <Typography variant="body2" color="success.main" gutterBottom>
              ✅ Executed successfully
            </Typography>
            {executionResult.output && (
              <pre style={{ fontSize: '12px', backgroundColor: '#f0f7ff', padding: '8px', borderRadius: '4px' }}>
                {JSON.stringify(executionResult.output, null, 2)}
              </pre>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="error.main" gutterBottom>
              ❌ Execution failed
            </Typography>
            <Typography variant="body2" color="error.main" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {executionResult.error}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const canExecute = ['text/javascript', 'text/python', 'application/json'].includes(artifact.type);
  const canPreview = ['text/html', 'application/react', 'image/svg+xml', 'text/markdown'].includes(artifact.type);

  return (
    <>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                {artifact.title}
              </Typography>
              {artifact.description && (
                <Typography variant="body2" color="textSecondary">
                  {artifact.description}
                </Typography>
              )}
            </Box>
            
            {showControls && (
              <Box display="flex" gap={1}>
                {canExecute && (
                  <Tooltip title="Execute">
                    <IconButton onClick={handleExecute} disabled={isExecuting}>
                      <RunIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Download">
                  <IconButton onClick={handleDownload}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fullscreen">
                  <IconButton onClick={() => setFullscreenOpen(true)}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<CodeIcon />} label="Code" />
            {canPreview && <Tab icon={<PreviewIcon />} label="Preview" />}
          </Tabs>
        </Box>

        {/* Content */}
        <TabPanel value={activeTab} index={0}>
          {renderCodeEditor()}
          {renderExecutionResult()}
        </TabPanel>
        
        {canPreview && (
          <TabPanel value={activeTab} index={1}>
            {renderPreview()}
          </TabPanel>
        )}
      </Paper>

      {/* Fullscreen Dialog */}
      <Dialog
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{artifact.title}</Typography>
            <IconButton onClick={() => setFullscreenOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ height: '100%' }}>
            {activeTab === 0 ? renderCodeEditor() : renderPreview()}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper functions
function getFileExtension(type: ArtifactType): string {
  const extensions: Record<ArtifactType, string> = {
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/react': '.jsx',
    'text/python': '.py',
    'text/sql': '.sql',
    'application/json': '.json',
    'text/yaml': '.yaml',
    'text/markdown': '.md',
    'image/svg+xml': '.svg'
  };
  return extensions[type] || '.txt';
}

async function executeArtifact(artifact: Artifact): Promise<any> {
  // Simplified execution - in a real implementation, you'd need proper sandboxing
  switch (artifact.type) {
    case 'text/javascript':
      try {
        // WARNING: This is unsafe in production - only for demo
        const result = eval(artifact.content);
        return { success: true, output: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Execution error' };
      }
    
    case 'application/json':
      try {
        const parsed = JSON.parse(artifact.content);
        return { success: true, output: parsed };
      } catch (error) {
        return { success: false, error: 'Invalid JSON' };
      }
    
    default:
      return { success: false, error: `Execution not supported for ${artifact.type}` };
  }
}