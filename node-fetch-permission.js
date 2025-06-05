// node-fetch-permission.js
// Use node-fetch package to retrieve permission details
// First run: npm install node-fetch

const fs = require('fs');
const path = require('path');

// Get the permission name from command line or use the default
const permissionName = process.argv[2] || 'EntitlementManagement.Read.All';

async function fetchPermission() {
  try {
    // Dynamically import node-fetch (ESM package)
    const fetch = await import('node-fetch').then(module => module.default);
    
    console.log(`Fetching ${permissionName} permission...`);
    
    const url = `https://graphpermissions.merill.net/permission/${permissionName}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received ${html.length} bytes of HTML content`);
    
    // Save the raw HTML
    const rawFileName = `${permissionName.replace(/\./g, '-')}-raw.html`;
    fs.writeFileSync(rawFileName, html);
    console.log(`Raw HTML written to ${rawFileName}`);
    
    // Simple HTML parsing
    const title = extractText(html, /<h1[^>]*>(.*?)<\/h1>/i);
    console.log(`Permission: ${title}`);
    
    const description = extractText(html, /<blockquote[^>]*>(.*?)<\/blockquote>/i);
    console.log(`\nDescription: ${description}`);
    
    // Check for tabbed resources
    const tabs = [];
    const tabGroupMatch = html.match(/<div\s+class="tabGroup"\s+id="tabgroup_2"[\s\S]*?<ul\s+role="tablist">([\s\S]*?)<\/ul>/i);
    
    if (tabGroupMatch && tabGroupMatch[1]) {
      console.log('\nFound tabbed resources:');
      
      // Extract tab names
      const tabsContent = tabGroupMatch[1];
      const tabsPattern = /<a\s+href="#tabpanel_2_([^"]*)"[^>]*>([^<]+)<\/a>/gi;
      let tabMatch;
      
      while ((tabMatch = tabsPattern.exec(tabsContent)) !== null) {
        const tabId = tabMatch[1];
        const tabName = tabMatch[2].trim();
        tabs.push({ id: tabId, name: tabName });
        console.log(`- ${tabName}`);
        
        // Try to find the tab panel content
        const tabPanelPattern = new RegExp(`<section\\s+id="tabpanel_2_${tabId}"[^>]*>([\\s\\S]*?)<\\/section>`, 'i');
        const tabPanelMatch = tabPanelPattern.exec(html);
        
        if (tabPanelMatch) {
          console.log(`  Found panel content (${tabPanelMatch[1].length} bytes)`);
        } else {
          console.log('  No panel content found');
        }
      }
    } else {
      console.log('\nNo tabbed resources found');
    }
    
    // Extract methods table
    const methodsMatch = html.match(/<table[^>]*>[\s\S]*?<th[^>]*>Methods<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
    if (methodsMatch) {
      console.log('\nFound Methods table');
      
      const methodRows = methodsMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      console.log(`Number of method rows: ${methodRows.length}`);
      
      if (methodRows.length > 0) {
        const sampleMethods = methodRows.slice(0, Math.min(3, methodRows.length));
        
        console.log('\nSample methods:');
        sampleMethods.forEach(row => {
          const methodMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          if (methodMatch) {
            console.log(`- ${cleanHtml(methodMatch[1])}`);
          }
        });
      }
    } else {
      console.log('\nNo Methods table found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function extractText(html, pattern) {
  const match = pattern.exec(html);
  if (match && match[1]) {
    return cleanHtml(match[1]);
  }
  return '';
}

function cleanHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim();                   // Trim leading/trailing whitespace
}

fetchPermission();
