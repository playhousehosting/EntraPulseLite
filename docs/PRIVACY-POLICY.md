# Privacy Policy for EntraPulse Lite

## Introduction

EntraPulse Lite is a desktop application designed to provide natural language querying of Microsoft Graph APIs through local LLM integration. This privacy policy explains how the application handles user data and authentication.

## Data Collection and Usage

### What We Collect
- **Authentication Tokens**: Temporary Microsoft authentication tokens required to access your Microsoft Entra ID resources
- **Configuration Settings**: Your application preferences and settings
- **Query History**: Your recent queries to facilitate conversation context

### What We Do NOT Collect
- We do not store or transmit your authentication tokens to any third-party servers
- We do not log or store your query results beyond the current session
- We do not track your usage patterns or collect analytics data

## Data Storage

All data is stored locally on your device:
- Authentication tokens are securely stored using Electron's secure storage mechanisms
- Configuration settings are saved locally in your application data folder
- No data is transmitted to external servers except direct API calls to Microsoft services that you authorize

## Local LLM Processing

When using local LLM models (Ollama or LM Studio):
- All query processing happens entirely on your local machine
- No queries or results are transmitted over the internet
- Your data remains private and secure within your environment

## Microsoft Graph API Access

EntraPulse Lite can only access Entra data and services that:
- You have explicit permission to access through Microsoft Graph
- You have authorized through the Microsoft authentication flow
- Is within the scope of permissions you've granted

## Permissions

The application uses a progressive permissions model:
- It starts with minimal permissions
- Additional permissions are requested only when needed for specific features
- You can review and approve each permission request
- You can revoke permissions at any time through your Microsoft account

## Data Retention

- Query context is retained only for the duration of your session
- Local authentication tokens are cleared when you sign out
- You can manually clear all stored data through the application settings

## Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any changes by updating the version number of this document.

## Contact

If you have any questions about this privacy policy, please contact the project maintainers through the GitHub repository.

---

*Last updated: June 17, 2025*
