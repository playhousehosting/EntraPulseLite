// Enhanced implementation for fetching user profile photos from Microsoft Graph
import { Client } from '@microsoft/microsoft-graph-client';

interface CachedPhoto {
  photoUrl: string | null;
  timestamp: number;
  userId: string;
}

/**
 * Improved method for fetching user profile photos from Microsoft Graph,
 * with multiple fallback mechanisms for better reliability and caching
 */
export class ProfilePhotoService {
  private client: Client;
  private photoCache: Map<string, CachedPhoto> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached photos

  constructor(client: Client) {
    this.client = client;
  }
  /**
   * Check if a cached photo is still valid
   */
  private isCacheValid(cachedPhoto: CachedPhoto): boolean {
    const now = Date.now();
    return (now - cachedPhoto.timestamp) < this.CACHE_DURATION;
  }
  /**
   * Get a photo from cache if available and valid
   */
  private getCachedPhoto(userId: string): string | null | undefined {
    const cached = this.photoCache.get(userId);
    if (cached && this.isCacheValid(cached)) {
      console.log(`[ProfilePhotoService] Using cached photo for user: ${userId}`);
      
      // For LRU: Remove and re-add to make it the most recently used
      this.photoCache.delete(userId);
      this.photoCache.set(userId, cached);
      
      return cached.photoUrl;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.photoCache.delete(userId);
      console.log(`[ProfilePhotoService] Removed expired cache entry for user: ${userId}`);
    }
    
    return undefined; // No valid cache found
  }

  /**
   * Store a photo in cache
   */
  private setCachedPhoto(userId: string, photoUrl: string | null): void {
    // Implement LRU cache by removing oldest entries if we exceed max size
    if (this.photoCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.photoCache.keys().next().value;
      if (oldestKey) {
        this.photoCache.delete(oldestKey);
        console.log(`[ProfilePhotoService] Removed oldest cache entry: ${oldestKey}`);
      }
    }

    this.photoCache.set(userId, {
      photoUrl,
      timestamp: Date.now(),
      userId
    });
    
    console.log(`[ProfilePhotoService] Cached photo for user: ${userId} (${photoUrl ? 'with photo' : 'no photo'})`);
  }

  /**
   * Clear all cached photos
   */
  public clearCache(): void {
    this.photoCache.clear();
    console.log('[ProfilePhotoService] Cache cleared');
  }

  /**
   * Clear cache for a specific user
   */
  public clearUserCache(userId: string): void {
    this.photoCache.delete(userId);
    console.log(`[ProfilePhotoService] Cache cleared for user: ${userId}`);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; entries: Array<{ userId: string; hasPhoto: boolean; age: number }> } {
    const now = Date.now();
    return {
      size: this.photoCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries: Array.from(this.photoCache.entries()).map(([userId, cached]) => ({
        userId,
        hasPhoto: cached.photoUrl !== null,
        age: now - cached.timestamp
      }))
    };
  }

  /**
   * Get a user's profile photo with multiple fallback mechanisms and caching
   * @param userId User ID or email address
   * @returns Base64-encoded photo data URI or null if no photo available
   */
  async getUserPhoto(userId: string = 'me'): Promise<string | null> {
    // Normalize the userId for consistent caching
    const normalizedUserId = userId.toLowerCase();
    
    // Check cache first
    const cachedResult = this.getCachedPhoto(normalizedUserId);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    console.log(`[ProfilePhotoService] Fetching photo for user: ${userId} (cache miss)`);
    
    try {
      // Import the ResponseType enum from the Microsoft Graph client
      const { ResponseType } = require('@microsoft/microsoft-graph-client');
      
      // If userId is an email, we need to get the user's ID first
      let userIdToUse = userId;
      let userEmail = userId; // Store email for Outlook fallback
      
      if (userId !== 'me' && userId.includes('@')) {
        try {
          console.log(`Getting user ID for email: ${userId}`);
          const userResponse = await this.client
            .api(`/users/${userId}`)
            .select('id')
            .get();
            
          if (userResponse && userResponse.id) {
            userIdToUse = userResponse.id;
            userEmail = userId; // Keep the email for fallbacks
            console.log(`Resolved email ${userId} to user ID: ${userIdToUse}`);
          }
        } catch (error: any) {
          console.log(`Failed to resolve email to ID: ${error.message || 'Unknown error'}`);
          // Continue with the email as the userId
        }
      }
        // Attempt 1: Try v1.0 endpoint (most reliable)
      try {
        console.log(`Trying to get photo for user ${userIdToUse} using v1.0 endpoint`);
        const photoResponse = await this.client
          .api(`/users/${userIdToUse}/photo/$value`)
          .responseType(ResponseType.ARRAYBUFFER)
          .get();
        
        // Convert the array buffer to a base64 string
        const base64 = Buffer.from(photoResponse).toString('base64');
        const photoUrl = `data:image/jpeg;base64,${base64}`;
        console.log('Photo obtained via v1.0 endpoint');
        
        // Cache the result
        this.setCachedPhoto(normalizedUserId, photoUrl);
        return photoUrl;
      } catch (standardError: any) {
        console.log(`V1.0 endpoint photo fetch failed: ${standardError.message || 'Unknown error'}`);
        console.log('V1.0 endpoint error details:', standardError);
      }
        // Attempt 2: Try direct profile photo from Exchange/Outlook
      // This often works when Graph API fails
      if (userId.includes('@') || userEmail.includes('@')) {
        const emailToUse = userId.includes('@') ? userId : userEmail;
        try {
          console.log(`Trying Exchange/Outlook endpoint for ${emailToUse}`);
          const photoResponse = await fetch(`https://outlook.office365.com/owa/service.svc/s/GetPersonaPhoto?email=${encodeURIComponent(emailToUse)}&UA=0&size=HR64x64`);
          
          if (photoResponse.ok) {            const photoBlob = await photoResponse.blob();
            const arrayBuffer = await photoBlob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const photoUrl = `data:image/jpeg;base64,${base64}`;
            console.log('Photo obtained via Exchange/Outlook endpoint');
            
            // Cache the result
            this.setCachedPhoto(normalizedUserId, photoUrl);
            return photoUrl;
          } else {
            console.log(`Exchange endpoint returned status: ${photoResponse.status}`);
          }
        } catch (outlookError: any) {
          console.log(`Exchange/Outlook endpoint failed: ${outlookError.message || 'Unknown error'}`);
        }
      }
        // All attempts failed
      console.log(`No photo available for user ${userId} after trying all methods`);
      
      // Cache the null result to avoid repeated failed attempts
      this.setCachedPhoto(normalizedUserId, null);
      return null;
    } catch (error: any) {
      console.error(`Failed to get user photo: ${error.message || 'Unknown error'}`);
      
      // Cache the null result to avoid repeated failed attempts for a short time
      this.setCachedPhoto(normalizedUserId, null);
      return null;
    }
  }
}
