// EnhancedChatInput.tsx
// Revolutionary AI-powered chat input with natural language processing, predictive suggestions, and automation workflows

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Typography,
  Autocomplete,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Collapse,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as AiIcon,
  AutoAwesome as AutoAwesomeIcon,
  Timeline as WorkflowIcon,
  Lightbulb as SuggestionIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SmartToy as SmartToyIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { organizationalIntelligence } from '../../shared/OrganizationalIntelligence';
import { naturalLanguageProcessor } from '../../shared/NaturalLanguageProcessor';
import type { ChatMessage } from '../../types';

interface EnhancedChatInputProps {
  onSendMessage: (message: string, enhancedContext?: any) => void;
  disabled?: boolean;
  placeholder?: string;
  currentUser?: any;
  isLoading?: boolean;
}

interface SmartSuggestion {
  id: string;
  text: string;
  type: 'query' | 'automation' | 'insight' | 'workflow';
  confidence: number;
  description: string;
  icon: React.ReactNode;
}

interface ParsedCommandPreview {
  intent: string;
  entities: string[];
  actions: string[];
  complexity: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: number;
  requiresApproval: boolean;
}

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask about your Microsoft Entra environment...",
  currentUser,
  isLoading = false
}) => {
  // Core state
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // AI-powered features
  const [commandPreview, setCommandPreview] = useState<ParsedCommandPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [proactiveInsights, setProactiveInsights] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  
  // Workflow features
  const [detectedWorkflow, setDetectedWorkflow] = useState<any>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  
  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize AI systems
  useEffect(() => {
    initializeAISystems();
    loadProactiveInsights();
  }, []);

  // Real-time input analysis
  useEffect(() => {
    if (inputValue.length > 3) {
      // Debounce analysis
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        analyzeInputInRealTime(inputValue);
      }, 500);
    } else {
      setCommandPreview(null);
      setShowPreview(false);
      setSuggestions([]);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputValue]);

  /**
   * INITIALIZATION
   */
  const initializeAISystems = async () => {
    try {
      await organizationalIntelligence.initialize();
      console.log('🧠 AI systems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI systems:', error);
    }
  };

  const loadProactiveInsights = async () => {
    try {
      const suggestions = organizationalIntelligence.getProactiveSuggestions();
      setProactiveInsights(suggestions);
      setShowInsights(suggestions.length > 0);
    } catch (error) {
      console.error('Failed to load proactive insights:', error);
    }
  };

  /**
   * REAL-TIME INPUT ANALYSIS
   */
  const analyzeInputInRealTime = async (input: string) => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Parse natural language input
      const parsedCommand = await naturalLanguageProcessor.processNaturalLanguage(input);
      
      // Generate command preview
      const preview: ParsedCommandPreview = {
        intent: parsedCommand.intent.primary,
        entities: parsedCommand.entities.map(e => e.type),
        actions: parsedCommand.actions.map(a => a.verb),
        complexity: parsedCommand.complexity,
        riskLevel: parsedCommand.actions.some(a => a.riskLevel === 'high') ? 'high' : 
                   parsedCommand.actions.some(a => a.riskLevel === 'medium') ? 'medium' : 'low',
        estimatedTime: parsedCommand.executionPlan.reduce((sum, step) => sum + step.estimated_duration, 0),
        requiresApproval: parsedCommand.complexity === 'enterprise' || 
                         parsedCommand.actions.some(a => a.riskLevel === 'high')
      };
      
      setCommandPreview(preview);
      setShowPreview(true);
      
      // Generate smart suggestions
      await generateSmartSuggestions(parsedCommand);
      
      // Detect workflow opportunities
      if (parsedCommand.complexity === 'complex' || parsedCommand.complexity === 'enterprise') {
        setDetectedWorkflow(parsedCommand);
      }
      
    } catch (error) {
      console.error('Failed to analyze input:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSmartSuggestions = async (parsedCommand: any) => {
    const newSuggestions: SmartSuggestion[] = [];
    
    // Query suggestions
    if (parsedCommand.intent.primary === 'query') {
      newSuggestions.push({
        id: 'expand-query',
        text: 'Show with filters and export options',
        type: 'query',
        confidence: 0.8,
        description: 'Enhance your query with advanced filtering and export capabilities',
        icon: <SuggestionIcon fontSize="small" />
      });
      
      if (parsedCommand.entities.some((e: any) => e.type === 'user')) {
        newSuggestions.push({
          id: 'user-insights',
          text: 'Include user risk analysis and activity patterns',
          type: 'insight',
          confidence: 0.7,
          description: 'Get comprehensive insights about user behavior and security risks',
          icon: <InsightsIcon fontSize="small" />
        });
      }
    }
    
    // Automation suggestions
    if (parsedCommand.intent.primary === 'management' && parsedCommand.actions.length > 1) {
      newSuggestions.push({
        id: 'create-automation',
        text: 'Create automated workflow for this process',
        type: 'automation',
        confidence: 0.9,
        description: 'Turn this multi-step process into an automated workflow',
        icon: <WorkflowIcon fontSize="small" />
      });
    }
    
    // Security suggestions
    if (parsedCommand.actions.some((a: any) => a.riskLevel === 'high')) {
      newSuggestions.push({
        id: 'security-review',
        text: 'Add security review and approval process',
        type: 'workflow',
        confidence: 0.85,
        description: 'Implement security controls for high-risk operations',
        icon: <SecurityIcon fontSize="small" />
      });
    }
    
    // Schedule suggestions
    if (parsedCommand.schedule) {
      newSuggestions.push({
        id: 'schedule-workflow',
        text: `Set up ${parsedCommand.schedule.frequency} automation`,
        type: 'automation',
        confidence: 0.95,
        description: 'Create a scheduled workflow for recurring tasks',
        icon: <ScheduleIcon fontSize="small" />
      });
    }
    
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  /**
   * MESSAGE HANDLING
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || disabled || isLoading) return;
    
    const messageToSend = inputValue.trim();
    
    // Enhanced context from AI analysis
    const enhancedContext = {
      commandPreview,
      aiSuggestions: suggestions,
      organizationalContext: organizationalIntelligence.getRelevantContext(messageToSend),
      timestamp: new Date()
    };
    
    // Learn from this interaction
    await organizationalIntelligence.learnFromConversation(
      'current-session',
      messageToSend,
      JSON.stringify(enhancedContext),
      'pending'
    );
    
    // Send message with enhanced context
    onSendMessage(messageToSend, enhancedContext);
    
    // Clear input and reset state
    setInputValue('');
    setCommandPreview(null);
    setShowPreview(false);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Reload proactive insights
    setTimeout(loadProactiveInsights, 1000);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const applySuggestion = (suggestion: SmartSuggestion) => {
    let enhancedInput = inputValue;
    
    switch (suggestion.type) {
      case 'query':
        enhancedInput += ' with detailed analysis and export options';
        break;
      case 'automation':
        enhancedInput += ' and create an automated workflow for this';
        break;
      case 'insight':
        enhancedInput += ' with comprehensive insights and risk analysis';
        break;
      case 'workflow':
        enhancedInput += ' with proper approval workflow and security controls';
        break;
    }
    
    setInputValue(enhancedInput);
    setShowSuggestions(false);
  };

  const createAutomationWorkflow = async () => {
    if (!detectedWorkflow) return;
    
    try {
      const workflowDescription = await naturalLanguageProcessor.createAutomationWorkflow(detectedWorkflow);
      setInputValue(inputValue + ` (${workflowDescription})`);
      setShowWorkflowDialog(false);
    } catch (error) {
      console.error('Failed to create automation workflow:', error);
    }
  };

  /**
   * RENDER HELPERS
   */
  const renderCommandPreview = () => {
    if (!commandPreview || !showPreview) return null;
    
    const getRiskColor = (level: string) => {
      switch (level) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        default: return 'success';
      }
    };
    
    return (
      <Collapse in={showPreview}>
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            mb: 1, 
            border: `1px solid`,
            borderColor: `${getRiskColor(commandPreview.riskLevel)}.main`,
            borderRadius: 2
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <SmartToyIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" color="primary">
                AI Command Analysis
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setShowPreview(false)}>
              <ExpandLessIcon />
            </IconButton>
          </Box>
          
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            <Chip 
              label={`Intent: ${commandPreview.intent}`} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={`Complexity: ${commandPreview.complexity}`} 
              size="small" 
              color="info" 
              variant="outlined" 
            />
            <Chip 
              label={`Risk: ${commandPreview.riskLevel}`} 
              size="small" 
              color={getRiskColor(commandPreview.riskLevel) as any}
              variant="outlined" 
            />
            {commandPreview.estimatedTime > 0 && (
              <Chip 
                label={`~${commandPreview.estimatedTime}s`} 
                size="small" 
                icon={<ScheduleIcon />}
                variant="outlined" 
              />
            )}
          </Box>
          
          {commandPreview.requiresApproval && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              This operation requires approval due to its complexity or risk level.
            </Alert>
          )}
          
          <Typography variant="body2" color="textSecondary">
            Entities: {commandPreview.entities.join(', ')} | Actions: {commandPreview.actions.join(', ')}
          </Typography>
        </Paper>
      </Collapse>
    );
  };

  const renderSmartSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;
    
    return (
      <Collapse in={showSuggestions}>
        <Paper elevation={2} sx={{ mb: 1, maxHeight: 300, overflow: 'auto' }}>
          <Box p={1}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
              💡 AI Suggestions
            </Typography>
          </Box>
          <List dense>
            {suggestions.map((suggestion) => (
              <ListItem
                key={suggestion.id}
                button
                onClick={() => applySuggestion(suggestion)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {suggestion.icon}
                </ListItemIcon>
                <ListItemText
                  primary={suggestion.text}
                  secondary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption">
                        {suggestion.description}
                      </Typography>
                      <Chip 
                        label={`${Math.round(suggestion.confidence * 100)}%`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Collapse>
    );
  };

  const renderProactiveInsights = () => {
    if (!showInsights || proactiveInsights.length === 0) return null;
    
    return (
      <Collapse in={showInsights}>
        <Card sx={{ mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <AiIcon />
                <Typography variant="subtitle2">
                  🔮 Claude's Proactive Insights
                </Typography>
              </Box>
              <IconButton 
                size="small" 
                onClick={() => setShowInsights(false)}
                sx={{ color: 'inherit' }}
              >
                <ExpandLessIcon />
              </IconButton>
            </Box>
            {proactiveInsights.map((insight, index) => (
              <Typography 
                key={index} 
                variant="body2" 
                sx={{ mb: index < proactiveInsights.length - 1 ? 1 : 0 }}
              >
                • {insight}
              </Typography>
            ))}
          </CardContent>
        </Card>
      </Collapse>
    );
  };

  return (
    <Box>
      {/* Proactive Insights */}
      {renderProactiveInsights()}
      
      {/* Command Preview */}
      {renderCommandPreview()}
      
      {/* Smart Suggestions */}
      {renderSmartSuggestions()}
      
      {/* Main Input */}
      <Box display="flex" gap={1} alignItems="flex-end">
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          variant="outlined"
          size="medium"
          inputRef={inputRef}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isProcessing ? 'warning.main' : 'primary.main',
                  borderWidth: 2
                }
              }
            }
          }}
          InputProps={{
            endAdornment: isProcessing && (
              <Box display="flex" alignItems="center" gap={1}>
                <AiIcon color="primary" fontSize="small" />
                <Typography variant="caption" color="primary">
                  Analyzing...
                </Typography>
              </Box>
            )
          }}
        />
        
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || disabled || isLoading}
          sx={{ 
            minWidth: 60,
            height: 44,
            bgcolor: commandPreview?.riskLevel === 'high' ? 'error.main' : 'primary.main',
            '&:hover': {
              bgcolor: commandPreview?.riskLevel === 'high' ? 'error.dark' : 'primary.dark'
            }
          }}
        >
          {isLoading ? <LinearProgress /> : <SendIcon />}
        </Button>
        
        {/* Toggle Suggestions Button */}
        {suggestions.length > 0 && (
          <IconButton
            onClick={() => setShowSuggestions(!showSuggestions)}
            color="primary"
            size="small"
          >
            {showSuggestions ? <ExpandLessIcon /> : <AutoAwesomeIcon />}
          </IconButton>
        )}
        
        {/* Toggle Insights Button */}
        {proactiveInsights.length > 0 && (
          <IconButton
            onClick={() => setShowInsights(!showInsights)}
            color="primary"
            size="small"
          >
            {showInsights ? <ExpandLessIcon /> : <InsightsIcon />}
          </IconButton>
        )}
      </Box>
      
      {/* Processing Indicator */}
      {isProcessing && (
        <LinearProgress 
          sx={{ 
            mt: 1, 
            borderRadius: 1,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'primary.main'
            }
          }} 
        />
      )}
      
      {/* Workflow Creation Dialog */}
      <Dialog
        open={showWorkflowDialog}
        onClose={() => setShowWorkflowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WorkflowIcon color="primary" />
            Create Automation Workflow
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Claude detected that your request involves multiple complex steps. 
            Would you like to create an automated workflow for this process?
          </Typography>
          {detectedWorkflow && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Detected Process:
              </Typography>
              <Chip label={detectedWorkflow.intent.primary} sx={{ mr: 1, mb: 1 }} />
              <Chip label={`${detectedWorkflow.actions.length} steps`} sx={{ mr: 1, mb: 1 }} />
              <Chip label={detectedWorkflow.complexity} color="info" sx={{ mb: 1 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWorkflowDialog(false)}>
            Not Now
          </Button>
          <Button 
            variant="contained" 
            onClick={createAutomationWorkflow}
            startIcon={<WorkflowIcon />}
          >
            Create Workflow
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};