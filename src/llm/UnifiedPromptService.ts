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

🎯 **PRIMARY MISSION**: Help users understand and interact with their Microsoft Graph data by presenting their actual data first when available, then providing guidance about permissions and security.

**CORE PRINCIPLES**:
1. **DATA FIRST** - Always present actual retrieved data to users before discussing permissions
2. **DIRECT ANSWERS** - When users ask for information and you have the data, show it directly
3. **CONTEXT AWARENESS** - Use the provided context to give precise, accurate answers
4. **PERMISSION GUIDANCE** - Provide permission guidance when operations fail or data is unavailable

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

    // Add permission guidance - BUT ONLY WHEN NEEDED
    if (includePermissionGuidance) {
      systemPrompt += `

� **PERMISSION GUIDANCE RULES** (Apply when operations fail or data is unavailable):

1. **PROVIDE PERMISSION GUIDANCE WHEN**:
   - Microsoft Graph operations fail with 403 Forbidden errors
   - No data is available in the context
   - User explicitly asks about permissions
   - Data retrieval fails due to insufficient permissions

2. **DO NOT PROVIDE PERMISSION GUIDANCE WHEN**:
   - Actual data is available in the context
   - User receives the information they requested
   - Operations are successful

3. **COMMON PERMISSION SCENARIOS** (reference when needed):
   - **User queries**: Require User.Read (basic) or User.Read.All (all users)
   - **Group queries**: Require Group.Read.All or Group.ReadWrite.All
   - **Directory queries**: Require Directory.Read.All or Directory.ReadWrite.All
   - **Sign-in activity**: Require AuditLog.Read.All or Directory.Read.All
   - **Mail queries**: Require Mail.Read, Mail.ReadWrite, or Mail.Send
   - **Calendar queries**: Require Calendars.Read or Calendars.ReadWrite

**PERMISSION REQUEST GUIDANCE** (when needed):
- Contact your Microsoft 365 administrator for additional permissions
- Provide specific permission names to request
- Use the "Request Permissions" feature if available
- Try operations within current permission scope

**REMEMBER**: Focus on presenting available data first, then provide permission guidance only when necessary.`;
    }

    // Add data context handling
    if (includeDataContext && contextData) {
      systemPrompt += `

📊 **DATA CONTEXT**:
Here is the relevant data retrieved from Microsoft Graph, Microsoft Learn documentation, and other sources:

${contextData}

🚨 **CRITICAL DATA PRESENTATION INSTRUCTIONS**:
1. **ALWAYS PRESENT THE ACTUAL DATA FIRST** - When Microsoft Graph data is available in the context, present it to the user immediately
2. **SHOW REAL RESULTS** - If the user asks for "group memberships" and the data contains group information, present the actual group names and details
3. **USE EXACT DATA** - Use ONLY the data provided in the context above
4. **PRECISE NUMBERS** - Use EXACT numbers from the data - never approximate or round
5. **BASE RESPONSE ON CONTEXT** - Base your response ENTIRELY on the provided context
6. **PRESENT FIRST, EXPLAIN LATER** - Show the data first, then provide any additional context or permission guidance
7. **NO HALLUCINATION** - DO NOT generate information not present in the context

**EXAMPLE APPROACH FOR GROUP QUERIES**:
- If asked "What groups is the user in?" and the context contains group membership data:
  ✅ "Based on the data retrieved, the user is a member of the following groups: [list actual group names]"
  ❌ "To get group membership information, you need Group.Read.All permission..."

**REMEMBER**: The user wants to see their actual data when it's available, not just permission requirements!`;
    }

    // Add response formatting
    systemPrompt += `

📋 **RESPONSE FORMATTING** (Claude Desktop Style):

**STRUCTURE FOR RESPONSES WITH DATA**:
1. **Start with the Answer** - Present the requested information immediately
2. **Show the Data** - Use clear formatting to display actual results
3. **Provide Context** - Explain what the data means
4. **Permission Context** - Only mention permissions if relevant to the query

**STRUCTURE FOR RESPONSES WITHOUT DATA**:
1. **Explain the Issue** - Why data isn't available
2. **Provide Permission Guidance** - What's needed to get the data
3. **Offer Alternatives** - What can be done with current permissions

**FORMATTING RULES**:
- NEVER show raw JSON data to users - format it clearly
- ## for main headings, ### for subsections
- **Bold** for important numbers and key terms
- • Bullet points for lists
- > Blockquotes for important insights
- \`code\` for technical terms or IDs
- Tables for structured data comparison
- Use emojis sparingly for visual appeal (📊 📈 👥 🏢 🔐)

**EXAMPLE RESPONSE FORMAT FOR GROUP MEMBERSHIP**:
## Your Group Memberships

You are a member of **5 groups**:

• **Marketing Team** - Microsoft 365 Group
• **All Company** - Security Group  
• **Sales Department** - Distribution Group
• **Project Alpha** - Microsoft 365 Group
• **IT Support** - Security Group

### Group Details
[Additional details about specific groups if relevant]

### Key Insights
> Most of your groups are organizational units, with 2 being project-specific teams

**REMEMBER**: Show the actual data first, then provide context and guidance as needed.`;

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
      response.toLowerCase().includes('requires') ||
      response.toLowerCase().includes('need') ||
      response.toLowerCase().includes('insufficient')
    );

    // Check if the response indicates successful data retrieval
    const hasSuccessfulData = (
      response.includes('|') || // Table formatting
      response.includes('Application Name') ||
      response.includes('App ID') ||
      response.includes('Created Date') ||
      response.includes('here is') ||
      response.includes('here are') ||
      response.includes('found') ||
      response.includes('retrieved') ||
      (response.length > 500 && !response.toLowerCase().includes('error')) // Long response likely contains data
    );

    // Only enhance if we detect permission issues, failed operations, or sign-in queries
    // Do NOT enhance if the response contains successful data
    if (hasSuccessfulData || (!hasPermissionIssue && !suggestsOperation && !isSignInQuery)) {
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
