// Unified Prompt Service - Ensures consistent system prompts and permission guidance across all LLM providers
import { ChatMessage } from '../types';

export interface PermissionContext {
  currentPermissions: string[];
  authMode: 'client-credentials' | 'interactive';
  permissionSource: 'actual' | 'configured' | 'default';
}

export interface UnifiedPromptOptions {
  includeMicrosoftGraphContext?: boolean;
  includePermissionGuidance?: boolean;
  includeDataContext?: boolean;
  contextData?: string;
  originalQuery?: string;
  permissionContext?: PermissionContext;
}

export class UnifiedPromptService {
  /**
   * Generate a unified system prompt that works consistently across all LLM providers
   */
  static generateSystemPrompt(options: UnifiedPromptOptions = {}): string {
    const {
      includeMicrosoftGraphContext = true,
      includePermissionGuidance = true,
      includeDataContext = false,
      contextData = '',
      permissionContext
    } = options;

    // Get the current provider from the config to optimize prompt
    let systemPrompt = `You are EntraPulse Assistant, an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant.

🎯 **PRIMARY MISSION**: Help users understand and interact with their Microsoft Graph data while providing clear guidance about permissions and security.

**IMPORTANT**: Be direct and focused. Don't search for random web content - stick to Microsoft Graph and Entra ID guidance.`;

    // Add permission context if available
    if (includePermissionGuidance && permissionContext) {
      systemPrompt += `

🔐 **CURRENT AUTHENTICATION CONTEXT**:
- Auth Mode: ${permissionContext.authMode}
- Current Permissions: ${permissionContext.currentPermissions.join(', ')}
- Permission Source: ${permissionContext.permissionSource}`;
    }

    // Add Microsoft Graph context
    if (includeMicrosoftGraphContext) {
      systemPrompt += `

📚 **MICROSOFT GRAPH EXPERTISE**:
You have comprehensive knowledge of:
- Microsoft Graph API endpoints and operations
- Microsoft Entra ID (Azure AD) concepts and architecture
- Permission scopes and security requirements
- Common identity and access management scenarios
- Troubleshooting Graph API issues`;
    }

    // Add permission guidance - THIS IS THE KEY PART FOR CONSISTENCY
    if (includePermissionGuidance) {
      systemPrompt += `

🚨 **CRITICAL PERMISSION GUIDANCE RULES** (APPLY TO ALL QUERIES):

1. **ALWAYS EXPLAIN PERMISSIONS**: When a user asks questions that might require Microsoft Graph permissions they don't have:
   - Clearly state what permissions are needed
   - List the specific permission scopes (e.g., "User.Read.All", "Group.Read.All", "Directory.Read.All")
   - Explain WHY each permission is required
   - Provide step-by-step guidance for obtaining permissions

2. **COMMON PERMISSION SCENARIOS**:
   - **User queries**: Require User.Read (basic) or User.Read.All (all users)
   - **Group queries**: Require Group.Read.All or Group.ReadWrite.All
   - **Directory queries**: Require Directory.Read.All or Directory.ReadWrite.All
   - **Sign-in activity**: Require AuditLog.Read.All or Directory.Read.All
   - **Mail queries**: Require Mail.Read, Mail.ReadWrite, or Mail.Send
   - **Calendar queries**: Require Calendars.Read or Calendars.ReadWrite

3. **PERMISSION ERROR HANDLING**:
   - If an operation fails with 403 Forbidden, immediately explain the missing permissions
   - Provide the exact permission scopes needed
   - Offer alternative approaches if available
   - Guide users on how to request additional permissions

4. **PROACTIVE PERMISSION AWARENESS**:
   - Before suggesting complex queries, mention required permissions
   - Focus on what the user needs to do to get the data they want
   - Be direct and actionable in your guidance

**PERMISSION REQUEST GUIDANCE**:
When users need additional permissions:
- Explain that they may need to contact their administrator
- Provide the specific permission names to request
- Suggest using the "Request Permissions" feature if available
- Offer workarounds using currently available permissions when possible

**IMPORTANT**: Focus on being helpful and direct. Don't retrieve random web content - stick to Microsoft Graph and Entra ID guidance.`;
    }

    // Add data context handling
    if (includeDataContext && contextData) {
      systemPrompt += `

📊 **DATA CONTEXT**:
Here is the relevant data retrieved from Microsoft Graph, Microsoft Learn documentation, and other sources:

${contextData}

🚨 **CRITICAL ANTI-HALLUCINATION INSTRUCTIONS**:
1. Use ONLY the data provided in the context above
2. Use EXACT numbers from the data - never approximate or round
3. Base your response ENTIRELY on the provided context
4. If asked for counts, use the precise number shown in the data
5. DO NOT generate information not present in the context`;
    }

    // Add response formatting
    systemPrompt += `

📋 **RESPONSE FORMATTING** (Claude Desktop Style):
1. NEVER show raw JSON data to users
2. Start with a clear summary using ## heading
3. Use extensive markdown formatting:
   - ## for main headings
   - ### for subsections
   - **Bold** for important numbers and key terms
   - • Bullet points for lists
   - > Blockquotes for important insights
   - \`code\` for technical terms or IDs
   - Tables for structured data comparison

4. **Structure your responses like this**:
   ## Summary
   [Direct answer with key information in **bold**]
   
   ### Details
   [Organized data presentation]
   
   ### Key Insights
   > [Analysis and patterns]
   
   ### Permission Requirements (if applicable)
   - **Required Permissions**: [List specific scopes]
   - **How to Request**: [Step-by-step guidance]

5. Use emojis sparingly for visual appeal (📊 📈 👥 🏢 🔐)
6. End with helpful context about what the data means

**REMEMBER**: Your primary goal is to be helpful while being absolutely clear about permission requirements and security implications.`;

    return systemPrompt;
  }

  /**
   * Enhance any LLM response to ensure consistent permission guidance
   */
  static enhanceResponseForPermissions(
    response: string, 
    provider: string,
    originalQuery: string,
    permissionContext?: PermissionContext
  ): string {
    // Skip enhancement if response already contains comprehensive permission guidance
    if (this.hasComprehensivePermissionGuidance(response)) {
      return response;
    }

    // For sign-in related queries, always add permission guidance
    const isSignInQuery = (
      originalQuery.toLowerCase().includes('sign in') ||
      originalQuery.toLowerCase().includes('signin') ||
      originalQuery.toLowerCase().includes('last sign') ||
      originalQuery.toLowerCase().includes('login')
    );

    // Check if the response indicates a failed operation or permission issue
    const hasPermissionIssue = (
      response.toLowerCase().includes('permission') ||
      response.toLowerCase().includes('access denied') ||
      response.toLowerCase().includes('forbidden') ||
      response.toLowerCase().includes('403') ||
      response.toLowerCase().includes('unauthorized') ||
      response.toLowerCase().includes('insufficient privileges')
    );

    // Check if the response suggests an operation that might need permissions
    const suggestsOperation = (
      response.toLowerCase().includes('unable to') ||
      response.toLowerCase().includes('cannot') ||
      response.toLowerCase().includes('failed') ||
      response.toLowerCase().includes('error') ||
      originalQuery.toLowerCase().includes('list') ||
      originalQuery.toLowerCase().includes('get') ||
      originalQuery.toLowerCase().includes('show') ||
      originalQuery.toLowerCase().includes('find')
    );

    // Only enhance if we detect permission issues, operations that might need permissions, or sign-in queries
    if (!hasPermissionIssue && !suggestsOperation && !isSignInQuery) {
      return response;
    }

    // Add comprehensive permission guidance
    let enhancement = `\n\n---\n\n`;
    
    if (isSignInQuery) {
      enhancement += `🔐 **Permission Requirements for Sign-in Data**: To access sign-in activity information, you need specific permissions.\n\n`;
      enhancement += `**Required Permissions for Sign-in Queries**:\n`;
      enhancement += `• **AuditLog.Read.All** - For reading sign-in logs and activity\n`;
      enhancement += `• **Directory.Read.All** - For reading user directory information\n`;
      enhancement += `• **User.Read.All** - For reading user profiles with sign-in activity\n\n`;
    } else if (hasPermissionIssue) {
      enhancement += `🔐 **Permission Guidance**: This operation requires additional Microsoft Graph permissions.\n\n`;
    } else {
      enhancement += `💡 **Permission Note**: For Microsoft Graph operations, you may need specific permissions.\n\n`;
    }

    if (!isSignInQuery) {
      enhancement += `**Common Required Permissions**:\n`;
      enhancement += `• **User.Read.All** - For reading user information across the organization\n`;
      enhancement += `• **Group.Read.All** - For reading group information\n`;
      enhancement += `• **Directory.Read.All** - For reading directory information\n`;
      enhancement += `• **Mail.Read** - For reading mail messages\n`;
      enhancement += `• **Calendars.Read** - For reading calendar information\n\n`;
    }

    if (permissionContext) {
      enhancement += `**Your Current Permissions**: ${permissionContext.currentPermissions.join(', ')}\n\n`;
    }

    enhancement += `**To Request Additional Permissions**:\n`;
    enhancement += `1. Contact your Microsoft 365 administrator\n`;
    enhancement += `2. Specify the exact permission scopes needed\n`;
    enhancement += `3. Use the "Request Permissions" feature if available in this application\n\n`;

    enhancement += `**Alternative Approach**: Try using the permissions you currently have, or ask for help with operations that work within your current permission scope.`;

    return response + enhancement;
  }

  /**
   * Create enhanced system messages with unified prompt
   */
  static createSystemMessage(options: UnifiedPromptOptions): ChatMessage {
    return {
      id: `unified-system-${Date.now()}`,
      role: 'system',
      content: this.generateSystemPrompt(options),
      timestamp: new Date()
    };
  }

  /**
   * Check if response already has comprehensive permission guidance
   */
  private static hasComprehensivePermissionGuidance(response: string): boolean {
    const permissionKeywords = [
      'permission',
      'User.Read',
      'Graph.Read',
      'Directory.Read',
      'required permissions',
      'permission scopes',
      'administrator'
    ];

    // If response contains multiple permission-related terms, it likely has good guidance
    const keywordCount = permissionKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    return keywordCount >= 3;
  }

  /**
   * Get provider-specific enhancements (if needed)
   */
  static getProviderSpecificEnhancements(provider: string): string {
    switch (provider) {
      case 'azure-openai':
        // Azure OpenAI typically provides good permission guidance, minimal enhancement needed
        return '';
      case 'ollama':
        // Local models may need more explicit permission guidance
        return `\n\n**Note for Local LLM**: This response was generated by a local model. For the most up-to-date Microsoft Graph permission requirements, consult the official Microsoft documentation.`;
      case 'openai':
      case 'anthropic':
      case 'gemini':
        // Cloud providers should follow the unified approach
        return '';
      default:
        return '';
    }
  }
}
