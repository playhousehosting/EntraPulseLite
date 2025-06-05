// test-fetch-permission.js
// Simple script to fetch permission information directly

const axios = require('axios');
const fs = require('fs').promises;
const { FetchMCPServer } = require('./src/mcp/servers/fetch');

// Create a simple FetchMCPServer instance to use its extractTextContent method
const fetchConfig = {
  name: 'fetch',
  type: 'fetch',
  port: 8080,
  enabled: true
};

const fetchServer = new FetchMCPServer(fetchConfig);

async function fetchPermissionInfo() {
  try {
    console.log('Fetching EntitlementManagement.Read.All permission details...');
    
    const url = 'https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'EntraPulse-Lite/1.0'
      }
    });
    
    const html = response.data;
    
    console.log('HTML content received, analyzing structure...');
    
    // Check for the permission title
    const titlePattern = /<h1[^>]*>(.*?)<\/h1>/i;
    const titleMatch = titlePattern.exec(html);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    console.log('Permission Title:', title);
    
    // Check for tab groups
    const tabGroupMatch = html.match(/<div\s+class="tabGroup"\s+id="tabgroup_2"[\s\S]*?<ul\s+role="tablist">([\s\S]*?)<\/ul>/i);
    
    if (tabGroupMatch && tabGroupMatch[1]) {
      console.log('Found tabbed resources structure');
      
      // Extract resource type tabs
      const tabsContent = tabGroupMatch[1];
      const tabsPattern = /<a\s+href="#tabpanel_2_([^"]*)"[^>]*>([^<]+)<\/a>/gi;
      let tabMatch;
      let tabsFound = [];
      
      while ((tabMatch = tabsPattern.exec(tabsContent)) !== null) {
        const resourceId = tabMatch[1];
        const resourceTypeName = tabMatch[2].trim();
        tabsFound.push({ id: resourceId, name: resourceTypeName });
        
        // Look for the tab panel content for this tab
        const tabPanelPattern = new RegExp(`<section\\s+id="tabpanel_2_${resourceId}"[^>]*>[\\s\\S]*?<table[^>]*>[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`, 'i');
        const tabPanelMatch = tabPanelPattern.exec(html);
        
        if (tabPanelMatch) {
          console.log(`\nResource Type: ${resourceTypeName}`);
          console.log('Properties found in table');
        } else {
          console.log(`\nResource Type: ${resourceTypeName} (no properties table found)`);
        }
      }
      
      console.log('\nAll tabs found:', tabsFound.map(t => t.name).join(', '));
    } else {
      console.log('No tabbed resources structure found');
      
      // Look for standard resources section
      const resourcesPattern = /<h2[^>]*>Resources<\/h2>([\s\S]*?)<(?:h2|\/body)/i;
      const resourcesMatch = resourcesPattern.exec(html);
      
      if (resourcesMatch) {
        console.log('Found standard resources section');
      } else {
        console.log('No resources section found');
      }
    }
    
    // Extract API Methods
    const methodsPattern = /<table[^>]*>[\s\S]*?<th[^>]*>Methods<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i;
    const methodsMatch = methodsPattern.exec(html);
    
    if (methodsMatch && methodsMatch[1]) {
      console.log('\nAPI Methods found in table');
      const methodRows = methodsMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      if (methodRows) {
        console.log(`Number of methods: ${methodRows.length}`);
        
        // Show first few methods
        const sampleSize = Math.min(3, methodRows.length);
        console.log(`Sample methods (first ${sampleSize}):`);
        
        for (let i = 0; i < sampleSize; i++) {
          const methodCellPattern = /<td[^>]*>([\s\S]*?)<\/td>/i;
          const methodCellMatch = methodCellPattern.exec(methodRows[i]);
          
          if (methodCellMatch) {
            const methodText = methodCellMatch[1].replace(/<[^>]+>/g, '').trim();
            console.log(`- ${methodText}`);
          }
        }
      }
    } else {
      console.log('\nNo API Methods table found');
    }
      console.log('\nAnalysis complete');
    
    // Now let's use the actual FetchMCPServer functionality to parse the permission
    console.log('\nUsing FetchMCPServer to parse the permission...');
    
    // Create a request that mimics what would happen in the MCP protocol
    const request = {
      id: '123',
      method: 'tools/call',
      params: {
        name: 'fetch_merill_permissions',
        arguments: {
          permission: 'EntitlementManagement.Read.All',
          includeDetails: true
        }
      }
    };
    
    // Override the fetchServer's axios.get method to use our already fetched data
    const originalAxiosGet = axios.get;
    axios.get = jest.fn().mockResolvedValue({ data: response.data });
    
    // Call the FetchMCPServer's handleRequest method
    const mcpResponse = await fetchServer.handleRequest(request);
    
    // Restore the original axios.get
    axios.get = originalAxiosGet;
    
    // Write the parsed result to a file
    const outputPath = 'entitlement-management-parsed.json';
    await fs.writeFile(outputPath, JSON.stringify(mcpResponse, null, 2));
    console.log(`\nParsed result written to ${outputPath}`);
    
    // Also write the text output to a markdown file for easy viewing
    if (mcpResponse.result && mcpResponse.result.content) {
      const textContent = mcpResponse.result.content.find(item => item.type === 'text');
      if (textContent) {
        const mdOutputPath = 'entitlement-management-parsed.md';
        await fs.writeFile(mdOutputPath, textContent.text);
        console.log(`Markdown text written to ${mdOutputPath}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status code:', error.response.status);
    }
  }
}

fetchPermissionInfo();
