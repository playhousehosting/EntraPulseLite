// test-live-entitlement-permission.js
// This script tests the actual live URL for EntitlementManagement.Read.All permission

const axios = require('axios');
const fs = require('fs').promises;

async function testLivePermissionFetch() {
  try {
    console.log('Fetching EntitlementManagement.Read.All permission from live URL...');
    
    const url = 'https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All';
    
    console.log(`Sending request to: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'EntraPulse-Lite/1.0'
      }
    });
    
    const html = response.data;
    console.log(`Received response with content length: ${html ? html.length : 0}`);
    
    // Save the raw HTML
    try {
      await fs.writeFile('entitlement-live.html', html);
      console.log(`Raw HTML content (${html.length} bytes) saved to entitlement-live.html`);
    } catch (writeError) {
      console.error('Error writing HTML file:', writeError.message);
    }
    
    // Extract methods using multiple patterns to handle different HTML structures
    const methods = [];
    
    // Pattern 1: Standard Methods table with "Methods" header
    const methodsPattern1 = /<table[^>]*>[\s\S]*?<th[^>]*>Methods<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi;
    let methodsMatch1;
    
    while ((methodsMatch1 = methodsPattern1.exec(html)) !== null) {
      const methodsBodyContent = methodsMatch1[1];
      const methodRows = methodsBodyContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      
      console.log(`Pattern 1: Found methods table with ${methodRows.length} rows`);
      
      extractMethodsFromRows(methodRows, methods);
    }
    
    // Pattern 2: "Graph Methods" structure
    const methodsPattern2 = /<h2[^>]*>Graph Methods<\/h2>[\s\S]*?<table[^>]*>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi;
    let methodsMatch2;
    
    while ((methodsMatch2 = methodsPattern2.exec(html)) !== null) {
      const methodsBodyContent = methodsMatch2[1];
      const methodRows = methodsBodyContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      
      console.log(`Pattern 2: Found Graph Methods table with ${methodRows.length} rows`);
      
      extractMethodsFromRows(methodRows, methods);
    }
      // Pattern 3: Any table that might contain method data
    const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let tableCount = 0;
    
    while ((tableMatch = tablePattern.exec(html)) !== null) {
      tableCount++;
      const tableContent = tableMatch[1];
      
      // Only process tables that likely contain API methods (containing GET, POST, etc.)
      if (/(GET|POST|PATCH|PUT|DELETE)/.test(tableContent) || 
          /\/identityGovernance\/entitlementManagement\//.test(tableContent)) {
        const methodRows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        
        if (methodRows.length > 0) {
          console.log(`Pattern 3: Found table ${tableCount} with ${methodRows.length} rows that may contain methods`);
          extractMethodsFromRows(methodRows, methods);
        }
      }
    }
    
    // Pattern 4: Look for method examples specifically for entitlementManagement
    const entitlementMethodPattern = /\/identityGovernance\/entitlementManagement\/[\w\/{}\-]+/gi;
    let entitlementMatch;
    
    while ((entitlementMatch = entitlementMethodPattern.exec(html)) !== null) {
      const methodPath = entitlementMatch[0];
      const method = `GET ${methodPath}`;
      
      if (!methods.includes(method)) {
        methods.push(method);
      }
    }
    
    // Helper function to extract methods from table rows
    function extractMethodsFromRows(rows, methodsArray) {              rows.forEach(row => {
                const methodCellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                let methodCellMatch;
                
                let rowText = '';
                // Gather all cells in the row to form a complete method
                while ((methodCellMatch = methodCellPattern.exec(row)) !== null) {
                  const cellContent = methodCellMatch[1]
                    .replace(/<[^>]+>/g, '')  // Remove HTML tags
                    .replace(/\s+/g, ' ')      // Collapse whitespace
                    .trim();                   // Trim leading/trailing whitespace
                    
                  rowText += (rowText ? ' ' : '') + cellContent;
                }
                
                // Process the complete row text
                if (rowText && !methodsArray.includes(rowText)) {
                  // Detect if this looks like a Graph API method
                  if (/(GET|POST|DELETE|PATCH|PUT)\s+\/(identityGovernance|users|groups)/.test(rowText)) {
                    methodsArray.push(rowText);
                  }
                }
              });
    }
      console.log(`Extracted ${methods.length} methods`);
    methods.slice(0, 5).forEach((m, i) => {
      console.log(`  Method ${i + 1}: ${m}`);
    });
    
    // Extract resource types from tab groups
    const resourceTypes = [];
    
    // Pattern 1: Extract resource tabs
    const tabsPattern = /<div[^>]*class="tabGroup"[^>]*>[\s\S]*?<ul[^>]*role="tablist">([\s\S]*?)<\/ul>/i;
    const tabsMatch = tabsPattern.exec(html);
    
    if (tabsMatch && tabsMatch[1]) {
      console.log('Found tabbed resource interface');
      const tabsContent = tabsMatch[1];
      const tabLinkPattern = /<a[^>]*href="#tabpanel_[^"]*"[^>]*>([^<]+)<\/a>/gi;
      let tabLinkMatch;
      
      while ((tabLinkMatch = tabLinkPattern.exec(tabsContent)) !== null) {
        const resourceName = tabLinkMatch[1].trim();
        if (resourceName && !resourceTypes.includes(resourceName)) {
          resourceTypes.push(resourceName);
        }
      }
      
      console.log(`Extracted ${resourceTypes.length} resource types from tabs`);
    } else {
      console.log('No tabbed resource interface found');
    }
    
    // Pattern 2: Look for sections with tabpanel roles
    const tabPanelPattern = /<section[^>]*id="tabpanel_[^"]*"[^>]*role="tabpanel"[^>]*>[\s\S]*?Graph reference:[^<]*<a[^>]*>([^<]+)<\/a>/gi;
    let tabPanelMatch;
    
    while ((tabPanelMatch = tabPanelPattern.exec(html)) !== null) {
      const resourceReference = tabPanelMatch[1].trim().split('/').pop();
      if (resourceReference && !resourceTypes.includes(resourceReference)) {
        resourceTypes.push(resourceReference);
      }
    }
    
    // Pattern 3: Look for standard resources list
    const resourcesListPattern = /<h[234][^>]*>Resources<\/h[234]>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i;
    const resourcesListMatch = resourcesListPattern.exec(html);
    
    if (resourcesListMatch && resourcesListMatch[1]) {
      const resourceListHtml = resourcesListMatch[1];
      const resourceItemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let resourceItemMatch;
      
      while ((resourceItemMatch = resourceItemPattern.exec(resourceListHtml)) !== null) {
        const resourceName = resourceItemMatch[1]
          .replace(/<[^>]+>/g, '')  // Remove HTML tags
          .replace(/\s+/g, ' ')      // Collapse whitespace
          .trim();                   // Trim leading/trailing whitespace
          
        if (resourceName && !resourceTypes.includes(resourceName)) {
          resourceTypes.push(resourceName);
        }
      }
      
      console.log(`Extracted ${resourceTypes.length} resource types from standard list`);
    }
      // Create formatted markdown
    let markdown = '# EntitlementManagement.Read.All Permission - Live Data\n\n';
    
    // Add methods section
    if (methods.length > 0) {
      markdown += `## API Methods (${methods.length} total)\n\n`;
      methods.forEach(method => {
        markdown += `- \`${method}\`\n`;
      });
    } else {
      markdown += '**No methods found in the HTML content**\n';
    }
    
    // Add resources section
    if (resourceTypes.length > 0) {
      markdown += `\n## Resource Types (${resourceTypes.length} total)\n\n`;
      resourceTypes.forEach(resource => {
        markdown += `- ${resource}\n`;
      });
    } else {
      markdown += '\n**No resource types found in the HTML content**\n';
    }
    
    // Add debugging info section
    markdown += '\n\n## Extraction Details\n\n';
    markdown += '### HTML Analysis\n\n';
    
    // Look for key elements and document their presence
    const hasTitle = /<h1[^>]*>EntitlementManagement\.Read\.All<\/h1>/i.test(html);
    markdown += `- Title element found: ${hasTitle ? 'Yes' : 'No'}\n`;
    
    const hasDescription = /<blockquote[^>]*>/i.test(html);
    markdown += `- Description element found: ${hasDescription ? 'Yes' : 'No'}\n`;
    
    const permissionTypePattern = /<div class="permission-type">([\s\S]*?)<\/div>/i;
    const permissionTypeMatch = permissionTypePattern.exec(html);
    markdown += `- Permission type element found: ${permissionTypeMatch ? 'Yes' : 'No'}\n`;
    
    const hasTabGroup = /<div\s+class="tabGroup"\s+id="tabgroup_2"/i.test(html);
    markdown += `- TabGroup element found: ${hasTabGroup ? 'Yes' : 'No'}\n`;
    
    const hasTabs = /<a\s+href="#tabpanel_2_([^"]*)"[^>]*>([^<]+)<\/a>/i.test(html);
    markdown += `- Tab elements found: ${hasTabs ? 'Yes' : 'No'}\n`;
    
    const methodsTablePattern = /<table[^>]*>[\s\S]*?<th[^>]*>Methods<\/th>/i;
    const hasMethodsTable = methodsTablePattern.test(html);
    markdown += `- Methods table found: ${hasMethodsTable ? 'Yes' : 'No'}\n`;
    
    const graphMethodsPattern = /<h2[^>]*>Graph Methods<\/h2>/i;
    const hasGraphMethods = graphMethodsPattern.test(html);
    markdown += `- Graph Methods section found: ${hasGraphMethods ? 'Yes' : 'No'}\n`;
    
    // Add pattern matching details
    markdown += '\n### Pattern Matching Results\n\n';
    markdown += `- Pattern 1 (Methods Table): ${methods.length > 0 ? 'Successful' : 'Not found or failed'}\n`;
    markdown += `- Pattern 2 (Graph Methods): ${hasGraphMethods ? 'Section found' : 'Section not found'}\n`;
    markdown += `- Pattern 3 (Resource Tabs): ${resourceTypes.length > 0 ? 'Successful' : 'Not found or failed'}\n`;
    
    // Save the markdown
    try {
      await fs.writeFile('entitlement-live-methods.md', markdown);
      console.log(`Data extracted and saved to entitlement-live-methods.md (${methods.length} methods, ${resourceTypes.length} resource types)`);
    } catch (writeError) {
      console.error('Error writing markdown file:', writeError.message);
    }
    
  } catch (error) {
    console.error('Error in testLivePermissionFetch:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error.message);
    }
    console.error('Error stack:', error.stack);
  }
}

console.log('Starting EntitlementManagement.Read.All permission test...');
testLivePermissionFetch()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Uncaught error:', err));
