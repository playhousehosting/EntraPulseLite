// simple-browser-fetch.js
// Use the global fetch API to retrieve the permission details

const fs = require('fs').promises;

async function fetchPermissionDetails() {
  try {
    console.log('Fetching EntitlementManagement.Read.All permission...');
    
    const url = 'https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All';
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received ${html.length} bytes of HTML content`);
    
    // Save the raw HTML
    await fs.writeFile('entitlement-raw.html', html);
    console.log('Raw HTML written to entitlement-raw.html');
    
    // Extract key information using regex
    const result = {
      title: extractText(html, /<h1[^>]*>(.*?)<\/h1>/i),
      description: extractText(html, /<blockquote[^>]*>(.*?)<\/blockquote>/i),
      tabs: []
    };
    
    // Check for tabbed resources
    const tabGroupMatch = html.match(/<div\s+class="tabGroup"\s+id="tabgroup_2"[\s\S]*?<ul\s+role="tablist">([\s\S]*?)<\/ul>/i);
    
    if (tabGroupMatch && tabGroupMatch[1]) {
      console.log('Found tabbed resources structure');
      
      // Extract tab names
      const tabsContent = tabGroupMatch[1];
      const tabsPattern = /<a\s+href="#tabpanel_2_([^"]*)"[^>]*>([^<]+)<\/a>/gi;
      let tabMatch;
      
      while ((tabMatch = tabsPattern.exec(tabsContent)) !== null) {
        result.tabs.push({
          id: tabMatch[1],
          name: tabMatch[2].trim()
        });
      }
    }
    
    // Write the analysis to a file
    await fs.writeFile('entitlement-analysis.json', JSON.stringify(result, null, 2));
    console.log('Analysis written to entitlement-analysis.json');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function extractText(html, pattern) {
  const match = pattern.exec(html);
  if (match && match[1]) {
    return match[1]
      .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Collapse whitespace
      .trim();                   // Trim leading/trailing whitespace
  }
  return '';
}

fetchPermissionDetails();
