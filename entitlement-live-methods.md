# EntitlementManagement.Read.All Permission - Live Data

## API Methods (77 total)

- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentApprovals/{accessPackageAssignmentRequestId}`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentApprovals/{accessPackageAssignmentRequestId}/stages`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentApprovals/{accessPackageAssignmentRequestId}/stages/{approvalStageId}`
- `GET /identityGovernance/entitlementManagement/accessPackages`
- `GET /identityGovernance/entitlementManagement/accessPackages/{accessPackageId}`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}?$expand=resourceRoleScopes($expand=role,scope)`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}/accessPackagesIncompatibleWith`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}/incompatibleAccessPackages`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}/incompatibleGroups`
- `GET /identityGovernance/entitlementManagement/accessPackages/filterByCurrentUser(on='allowedRequestor')`
- `GET /identityGovernance/entitlementManagement/assignmentPolicies`
- `GET /identityGovernance/entitlementManagement/assignmentPolicies/{accessPackageAssignmentPolicyId}`
- `GET /identityGovernance/entitlementManagement/assignmentRequests`
- `GET /identityGovernance/entitlementManagement/assignmentRequests/{accessPackageAssignmentRequestId}`
- `GET /identityGovernance/entitlementManagement/assignmentRequests/filterByCurrentUser(on='parameterValue')`
- `GET /identityGovernance/entitlementManagement/assignments`
- `GET /identityGovernance/entitlementManagement/assignments/{accessPackageAssignmentId}`
- `GET /identityGovernance/entitlementManagement/assignments/additionalAccess(accessPackageId='parameterValue',incompatibleAccessPackageId='parameterValue')`
- `GET /identityGovernance/entitlementManagement/assignments/filterByCurrentUser(on='parameterValue')`
- `GET /identityGovernance/entitlementManagement/catalogs`
- `GET /identityGovernance/entitlementManagement/catalogs/{accessPackageCatalogId}`
- `GET /identityGovernance/entitlementManagement/catalogs/{catalogId}/customWorkflowExtensions`
- `GET /identityGovernance/entitlementManagement/catalogs/{catalogId}/customWorkflowExtensions/{accessPackageCustomWorkflowExtensionId}`
- `GET /identityGovernance/entitlementManagement/catalogs/{catalogId}/resourceRoles?$filter=(originSystem+eq+%27{originSystemType}%27+and+resource/id+eq+%27{resourceId}%27)&amp;$expand=resource`
- `GET /identityGovernance/entitlementManagement/catalogs/{id}/resources`
- `GET /identityGovernance/entitlementManagement/connectedOrganizations`
- `GET /identityGovernance/entitlementManagement/connectedOrganizations/{connectedOrganizationId}`
- `GET /identityGovernance/entitlementManagement/connectedOrganizations/{id}/externalSponsors`
- `GET /identityGovernance/entitlementManagement/connectedOrganizations/{id}/internalSponsors`
- `GET /identityGovernance/entitlementManagement/resourceRequests`
- `GET /identityGovernance/entitlementManagement/settings`
- `POST /identityGovernance/entitlementManagement/accessPackages/{accessPackageId}/getApplicablePolicyRequirements`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentApprovals/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentApprovals/{id}/steps`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentApprovals/{id}/steps/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentPolicies`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentPolicies/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentRequests`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentRequests/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentRequests/filterByCurrentUser(on='parameterValue')`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentResourceRoles`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentResourceRoles/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignments`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignments/additionalAccess(accessPackageId='parameterValue',incompatibleAccessPackageId='parameterValue')`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignments/filterByCurrentUser(on='parameterValue')`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/accessPackageCustomWorkflowExtensions`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/accessPackageCustomWorkflowExtensions/{accessPackageCustomWorkflowExtensionId}`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/accessPackageResourceRoles?$filter=(originSystem+eq+%27{originSystemType}%27+and+accessPackageResource/id+eq+%27{resourceId}%27)&amp;$expand=accessPackageResource`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/customAccessPackageWorkflowExtensions`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/customAccessPackageWorkflowExtensions/{customAccessPackageWorkflowExtensionId}`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{id}/accessPackageResources`
- `GET /identityGovernance/entitlementManagement/accessPackageResourceEnvironments/{accessPackageResourceEnvironmentId}`
- `GET /identityGovernance/entitlementManagement/accessPackageResourceRequests`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}?$expand=accessPackageResourceRoleScopes($expand=accessPackageResourceRole,accessPackageResourceScope)`
- `GET /identityGovernance/entitlementManagement/connectedOrganizations/{id}`
- `POST /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/accessPackageCustomWorkflowExtensions`
- `POST /identityGovernance/entitlementManagement/accessPackages/{id}/getApplicablePolicyRequirements`
- `allowExternalSenders Boolean Indicates if people external to the organization can send messages to the group. The default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).`
- `autoSubscribeNewMembers Boolean Indicates if new members added to the group are autosubscribed to receive email notifications. You can set this property in a PATCH request for the group; don't set it in the initial POST request that creates the group. Default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).`
- `hideFromAddressLists Boolean True if the group isn't displayed in certain parts of the Outlook UI: the Address Book, address lists for selecting message recipients, and the Browse Groups dialog for searching groups; otherwise, false. The default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).`
- `hideFromOutlookClients Boolean True if the group isn't displayed in Outlook clients, such as Outlook for Windows and Outlook on the web; otherwise, false. The default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).`
- `isSubscribedByMail Boolean Indicates whether the signed-in user is subscribed to receive email conversations. The default value is true. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).`
- `unseenCount Int32 Count of conversations that received new posts since the signed-in user last visited the group. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).`
- `GET /identityGovernance/entitlementManagement/accessPackages/filterByCurrentUser`
- `GET /identityGovernance/entitlementManagement/assignmentRequests/filterByCurrentUser`
- `GET /identityGovernance/entitlementManagement/assignments/additionalAccess`
- `GET /identityGovernance/entitlementManagement/assignments/filterByCurrentUser`
- `GET /identityGovernance/entitlementManagement/catalogs/{catalogId}/resourceRoles`
- `GET /identityGovernance/entitlementManagement/accessPackages/{accessPackageId}/getApplicablePolicyRequirements`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignmentRequests/filterByCurrentUser`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignments/additionalAccess`
- `GET /identityGovernance/entitlementManagement/accessPackageAssignments/filterByCurrentUser`
- `GET /identityGovernance/entitlementManagement/accessPackageCatalogs/{catalogId}/accessPackageResourceRoles`
- `GET /identityGovernance/entitlementManagement/accessPackages/{id}/getApplicablePolicyRequirements`

## Resource Types (37 total)

- accessPackage
- accessPackageAssignment
- accesspackageassignment-accesspackageassignmentfilterbycurrentuseroptions
- accessPackageAssignmentPolicy
- accessPackageAssignmentRequest
- accesspackageassignmentrequest-accesspackageassignmentrequestfilterbycurrentuseroptions
- accessPackageAssignmentRequestRequirements
- accessPackageAssignmentRequestWorkflowExtension
- accessPackageAssignmentResourceRole
- accessPackageAssignmentWorkflowExtension
- accessPackageCatalog
- accessPackageResource
- accessPackageResourceEnvironment
- accessPackageResourceRequest
- accessPackageResourceRole
- accessPackageResourceRoleScope
- accessPackageResourceScope
- approval
- approvalStage
- approvalStep
- connectedOrganization
- customaccesspackageworkflowextension
- customExtensionAuthenticationConfiguration
- customExtensionCallbackConfiguration
- customExtensionEndpointConfiguration
- directoryObject
- entitlementmanagement-overview
- entitlementManagementSettings
- externalSponsors
- group
- internalSponsors
- privilegedAccessGroupAssignmentScheduleRequest
- privilegedidentitymanagement-for-groups-api-overview
- privilegedidentitymanagementv3-overview
- unifiedRoleAssignment
- unifiedRoleAssignmentScheduleRequest
- unifiedRoleDefinition


## Extraction Details

### HTML Analysis

- Title element found: Yes
- Description element found: Yes
- Permission type element found: No
- TabGroup element found: Yes
- Tab elements found: Yes
- Methods table found: Yes
- Graph Methods section found: Yes

### Pattern Matching Results

- Pattern 1 (Methods Table): Successful
- Pattern 2 (Graph Methods): Section found
- Pattern 3 (Resource Tabs): Successful
