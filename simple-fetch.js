// simple-fetch.js
// A simple script to fetch permission details and write them to files

const axios = require('axios');
const fs = require('fs').promises;

async function fetchAndAnalyzePermission() {
  try {
    console.log('Fetching EntitlementManagement.Read.All permission details...');
    
    const url = 'https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'EntraPulse-Lite/1.0'
      }
    });
    
    const html = response.data;
    
    // Write the raw HTML to a file
    await fs.writeFile('entitlement-raw.html', html);
    console.log('Raw HTML written to entitlement-raw.html');
    
    // Basic analysis
    const result = {
      title: '',
      description: '',
      permissionType: '',
      resources: [],
      methods: []
    };
    
    // Extract title
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (titleMatch) {
      result.title = cleanHtml(titleMatch[1]);
    }
    
    // Extract description
    const descriptionMatch = html.match(/<blockquote[^>]*>(.*?)<\/blockquote>/i);
    if (descriptionMatch) {
      result.description = cleanHtml(descriptionMatch[1]);
    }
    
    // Extract permission type
    const permissionTypeMatch = html.match(/<div class="permission-type">([\s\S]*?)<\/div>/i);
    if (permissionTypeMatch) {
      result.permissionType = cleanHtml(permissionTypeMatch[1]);
    }
    
    // Extract API methods
    const methodsSection = html.match(/<table[^>]*>[\s\S]*?<th[^>]*>Methods<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
    if (methodsSection) {
      const methodRows = methodsSection[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      methodRows.forEach(row => {
        const methodMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
        if (methodMatch) {
          result.methods.push(cleanHtml(methodMatch[1]));
        }
      });
    }
    
    // Extract tabbed resources
    const tabGroupMatch = html.match(/<div\s+class="tabGroup"\s+id="tabgroup_2"[\s\S]*?<ul\s+role="tablist">([\s\S]*?)<\/ul>/i);
    if (tabGroupMatch) {
      const tabsContent = tabGroupMatch[1];
      const tabsPattern = /<a\s+href="#tabpanel_2_([^"]*)"[^>]*>([^<]+)<\/a>/gi;
      
      let tabMatch;
      while ((tabMatch = tabsPattern.exec(tabsContent)) !== null) {
        const resourceId = tabMatch[1];
        const resourceName = tabMatch[2].trim();
        
        const resource = {
          name: resourceName,
          properties: []
        };
        
        // Find the resource panel content
        const tabPanelPattern = new RegExp(`<section\\s+id="tabpanel_2_${resourceId}"[^>]*>[\\s\\S]*?<table[^>]*>[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`, 'i');
        const tabPanelMatch = tabPanelPattern.exec(html);
        
        if (tabPanelMatch) {
          const propertiesRows = tabPanelMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
          
          propertiesRows.forEach(row => {
            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (cells && cells.length >= 3) {
              resource.properties.push({
                name: cleanHtml(cells[0]),
                type: cleanHtml(cells[1]),
                description: cleanHtml(cells[2])
              });
            }
          });
        }
        
        result.resources.push(resource);
      }
    }
    
    // Write the analysis to a JSON file
    await fs.writeFile('entitlement-analysis.json', JSON.stringify(result, null, 2));
    console.log('Analysis written to entitlement-analysis.json');
    
    // Create a markdown representation
    let markdown = `# ${result.title}\n\n`;
    markdown += `${result.permissionType}\n\n`;
    markdown += `${result.description}\n\n`;
    
    // Add methods section
    if (result.methods.length > 0) {
      markdown += `## Available API Methods\n\n`;
      result.methods.forEach(method => {
        markdown += `- \`${method}\`\n`;
      });
      markdown += '\n';
    }
    
    // Add resources section
    if (result.resources.length > 0) {
      markdown += `## Resources\n\n`;
      
      result.resources.forEach(resource => {
        markdown += `### ${resource.name}\n\n`;
        
        if (resource.properties.length > 0) {
          markdown += '| Property | Type | Description |\n';
          markdown += '| --- | --- | --- |\n';
          
          resource.properties.forEach(prop => {
            markdown += `| \`${prop.name}\` | ${prop.type} | ${prop.description} |\n`;
          });
          
          markdown += '\n';
        } else {
          markdown += 'No detailed properties available for this resource type.\n\n';
        }
      });
    }
    
    // Write markdown to file
    await fs.writeFile('entitlement-analysis.md', markdown);
    console.log('Markdown written to entitlement-analysis.md');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status code:', error.response.status);
    }
  }
}

function cleanHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim();                   // Remove leading/trailing whitespace
}

fetchAndAnalyzePermission();
