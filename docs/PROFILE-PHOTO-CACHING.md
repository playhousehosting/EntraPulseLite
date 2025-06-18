# Profile Photo Caching Implementation

## Overview

This document describes the multi-level caching system implemented to optimize user profile photo retrieval and reduce unnecessary Microsoft Graph API calls.

## Problem Statement

Previously, every user query in the UI would trigger a fresh Microsoft Graph API call to retrieve the user's profile photo. Since profile photos rarely change during a session, this resulted in:

- Unnecessary API calls and network traffic
- Slower UI response times
- Potential rate limiting issues
- Poor user experience

## Solution

A multi-level caching system has been implemented with three levels of optimization:

### 1. Server-Side Service Cache (ProfilePhotoService)

**Location**: `src/shared/ProfilePhotoService.ts`

**Features**:
- 30-minute cache duration
- LRU (Least Recently Used) eviction policy
- Maximum 100 cached photos
- Caches both successful photo URLs and null results (to avoid repeated failed attempts)
- Normalized user IDs for consistent caching

**API Methods**:
```typescript
- getUserPhoto(userId): Get photo with caching
- clearCache(): Clear all cached photos
- clearUserCache(userId): Clear cache for specific user
- getCacheStats(): Get cache statistics
```

### 2. Component Session Cache (UserProfileAvatar)

**Location**: `src/renderer/components/UserProfileAvatar.tsx`

**Features**:
- 5-minute session-level cache
- In-memory storage that persists during the application session
- Avoids re-fetching photos when components re-render
- Request cancellation to prevent race conditions

**Benefits**:
- Immediate photo display on component re-render
- Reduced server-side cache hits
- Better component performance

### 3. User Object Photo URL

**Features**:
- Photos stored directly in user objects when available
- Highest priority cache level
- Instant photo display

## Cache Hierarchy

The system follows this priority order:

1. **User Object Photo URL** (if available)
2. **Session Cache** (5-minute duration)
3. **Service Cache** (30-minute duration)
4. **Microsoft Graph API** (fresh fetch)

## Cache Management

### Automatic Management
- Expired entries are automatically removed
- LRU eviction when cache size limits are reached
- Failed requests are cached to prevent repeated failures

### Manual Management
Available through IPC handlers:

```typescript
// Clear all photo caches
await window.electronAPI.graph.clearPhotoCache();

// Clear cache for specific user
await window.electronAPI.graph.clearUserPhotoCache(userId);

// Get cache statistics
const stats = await window.electronAPI.graph.getPhotoCacheStats();
```

### Session Cache Management
Available through component exports:

```typescript
import { 
  clearSessionPhotoCache, 
  clearUserSessionCache, 
  getSessionCacheStats 
} from './UserProfileAvatar';

// Clear all session cache
clearSessionPhotoCache();

// Clear session cache for specific user
clearUserSessionCache(userKey);

// Get session cache stats
const stats = getSessionCacheStats();
```

## Performance Benefits

### Before Implementation
- Every query: 1 API call for photo retrieval
- ~200-500ms delay per photo fetch
- Repeated identical API calls

### After Implementation
- First query: 1 API call (cached for 30 minutes)
- Subsequent queries: Instant retrieval from cache
- Dramatic reduction in API calls and latency

## Configuration

### Cache Durations
```typescript
// Service cache
private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Session cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### Cache Sizes
```typescript
// Service cache
private readonly MAX_CACHE_SIZE = 100; // Maximum cached photos
```

## Error Handling

- Failed photo fetches are cached as `null` to prevent repeated failures
- Network timeouts and errors don't break the caching system
- Request cancellation prevents race conditions in components

## Logging

The caching system provides detailed logging:

```
[ProfilePhotoService] Using cached photo for user: user@example.com
[ProfilePhotoService] Cached photo for user: user@example.com (with photo)
[UserProfileAvatar] Using session cache for: user@example.com
[UserProfileAvatar] Cache miss, fetching photo for: John Doe (user@example.com)
```

## Future Enhancements

Potential improvements:
- Persistent cache storage (localStorage/IndexedDB)
- Cache preloading for frequently accessed users
- Smart cache invalidation based on user profile changes
- Configurable cache durations per tenant
- Cache analytics and monitoring

## Testing

The caching implementation includes:
- Unit tests for ProfilePhotoService caching logic
- Integration tests for the complete cache hierarchy
- Performance benchmarks comparing before/after implementation

## Compatibility

This implementation is backward compatible and doesn't change the external API surface. Existing code will automatically benefit from caching without modifications.
