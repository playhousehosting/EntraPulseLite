// renderer-fetch-script.js
// This script can be run in the renderer process of an Electron app

async function fetchPermissionData() {
  try {
    // Get the permission name from a URL parameter or use the default
    const urlParams = new URLSearchParams(window.location.search);
    const permissionName = urlParams.get('permission') || 'EntitlementManagement.Read.All';
    
    // Display status
    document.getElementById('status').textContent = `Fetching ${permissionName} permission...`;
    
    // Fetch the permission data
    const url = `https://graphpermissions.merill.net/permission/${permissionName}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Update status
    document.getElementById('status').textContent = 
      `Received ${html.length} bytes of HTML for ${permissionName}`;
    
    // Create a blob and download link
    const blob = new Blob([html], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = `${permissionName.replace(/\./g, '-')}.html`;
    downloadLink.textContent = `Download ${permissionName} HTML`;
    
    document.getElementById('download').appendChild(downloadLink);
    
    // Simple parsing of the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title
    const title = doc.querySelector('h1')?.textContent || '';
    
    // Extract description
    const description = doc.querySelector('blockquote')?.textContent || '';
    
    // Extract permission type
    const permTypeElement = doc.querySelector('.permission-type');
    const permissionType = permTypeElement ? permTypeElement.textContent.trim() : '';
    
    // Look for tabbed resources
    const tabGroup = doc.querySelector('.tabGroup[id="tabgroup_2"]');
    const resourceTypes = [];
    
    if (tabGroup) {
      const tabs = tabGroup.querySelectorAll('a[role="tab"]');
      
      tabs.forEach(tab => {
        const tabId = tab.getAttribute('href')?.replace('#tabpanel_2_', '');
        const tabName = tab.textContent?.trim() || '';
        
        if (tabId) {
          const tabPanel = doc.querySelector(`#tabpanel_2_${tabId}`);
          const properties = [];
          
          if (tabPanel) {
            const propTable = tabPanel.querySelector('table tbody');
            if (propTable) {
              const rows = propTable.querySelectorAll('tr');
              rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                  properties.push({
                    name: cells[0].textContent?.trim() || '',
                    type: cells[1].textContent?.trim() || '',
                    description: cells[2].textContent?.trim() || ''
                  });
                }
              });
            }
          }
          
          resourceTypes.push({
            name: tabName,
            properties: properties
          });
        }
      });
    }
    
    // Extract methods
    const methodsTable = doc.querySelector('table th:contains("Methods")');
    const methods = [];
    
    if (methodsTable) {
      const methodRows = methodsTable.closest('table').querySelectorAll('tbody tr');
      methodRows.forEach(row => {
        const methodCell = row.querySelector('td');
        if (methodCell) {
          methods.push(methodCell.textContent?.trim() || '');
        }
      });
    }
    
    // Create a JSON representation
    const result = {
      title,
      description,
      permissionType,
      resourceTypes,
      methods
    };
    
    // Display the JSON
    const resultPre = document.getElementById('result');
    resultPre.textContent = JSON.stringify(result, null, 2);
    
    // Create a download link for the JSON
    const jsonBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${permissionName.replace(/\./g, '-')}.json`;
    jsonLink.textContent = `Download ${permissionName} JSON`;
    
    document.getElementById('download').appendChild(document.createElement('br'));
    document.getElementById('download').appendChild(jsonLink);
    
  } catch (error) {
    document.getElementById('status').textContent = `Error: ${error.message}`;
    console.error(error);
  }
}

// Run when the page loads
window.addEventListener('DOMContentLoaded', fetchPermissionData);
