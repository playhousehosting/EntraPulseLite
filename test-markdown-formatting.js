// Test script to verify markdown formatting in responses
const sampleResponse = `## Summary
I found **7 guest accounts** in your Microsoft Entra ID directory.

### User Details
| Name | Email | User Type | Creation Date |
|------|-------|-----------|---------------|
| **John Doe** | john.doe@external.com | Guest | 2024-01-15 |
| **Jane Smith** | jane.smith@partner.com | Guest | 2024-02-20 |
| **Bob Wilson** | bob.wilson@vendor.com | Guest | 2024-03-10 |

### Key Insights
> **Domain Analysis**: Guest users come from 3 different external domains
> 
> **Recent Activity**: 5 out of 7 guests signed in within the last 30 days
> 
> **Security Note**: All guest accounts have appropriate \`User.Read\` permissions

### Recommendations
- Review guest access permissions quarterly
- Monitor guest sign-in activity for security
- Consider implementing conditional access policies for external users

*This data was retrieved from Microsoft Graph API endpoint \`/users?$filter=userType eq 'Guest'\`*`;

console.log('=== SAMPLE FORMATTED RESPONSE ===');
console.log(sampleResponse);
console.log('\n=== END SAMPLE ===');

console.log('\nThis response demonstrates:');
console.log('✅ Bold numbers (**7 guest accounts**)');
console.log('✅ Clear headings (## Summary, ### Details)');
console.log('✅ Structured tables for user data');
console.log('✅ Blockquotes for insights (> Key Insights)');
console.log('✅ Code formatting for technical terms (`User.Read`)');
console.log('✅ Professional, Claude Desktop-style presentation');
