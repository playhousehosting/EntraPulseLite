# EntitlementManagement.Read.All

**Permission type: Delegated, Application**

Allows the app to read access packages and related entitlement management resources on behalf of the signed-in user.

## Available API Methods

- `GET /identityGovernance/entitlementManagement/accessPackages`
- `GET /identityGovernance/entitlementManagement/accessPackages/{accessPackageId}`
- `GET /identityGovernance/entitlementManagement/catalogs`
- `GET /identityGovernance/entitlementManagement/catalogs/{accessPackageCatalogId}`

## Resources

### Access Package

| Property | Type | Description |
| --- | --- | --- |
| `id` | String | The unique identifier for the access package. |
| `displayName` | String | The display name of the access package. |
| `description` | String | The description of the access package. |

### Catalog

| Property | Type | Description |
| --- | --- | --- |
| `id` | String | The unique identifier for the catalog. |
| `displayName` | String | The display name of the catalog. |
| `state` | String | Whether the catalog is published or not. |

### Setting

| Property | Type | Description |
| --- | --- | --- |
| `requestApprovalSettings` | Object | Settings for approval of requests. |
| `expirationSettings` | Object | Settings for expiration of access. |

