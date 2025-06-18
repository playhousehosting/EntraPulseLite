// Unit tests for ProfilePhotoService
import { ProfilePhotoService } from '../../shared/ProfilePhotoService';

describe('ProfilePhotoService', () => {
  let profilePhotoService: ProfilePhotoService;
  
  // Mock the ResponseType enum
  const mockResponseType = {
    ARRAYBUFFER: 'arraybuffer'
  };
  
  // Mock the require for @microsoft/microsoft-graph-client
  jest.mock('@microsoft/microsoft-graph-client', () => ({
    ResponseType: mockResponseType
  }));
  
  // Mock Graph client
  const mockGraphClient: any = {
    api: jest.fn().mockReturnThis(),
    responseType: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    get: jest.fn()
  };
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Reset global fetch mock
    delete (global as any).fetch;
    profilePhotoService = new ProfilePhotoService(mockGraphClient);
  });
  describe('getUserPhoto', () => {    it('should fetch a user photo successfully', async () => {
      // Mock a successful photo response
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      
      // V1.0 endpoint succeeds
      mockGraphClient.get.mockResolvedValueOnce(mockPhotoBuffer);
      
      const result = await profilePhotoService.getUserPhoto('user123');
      
      // Should have tried v1.0 endpoint
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user123/photo/$value');
      // Should have set responseType for the binary data
      expect(mockGraphClient.responseType).toHaveBeenCalled();
      // Should return base64 encoded image
      expect(result).toBe(`data:image/jpeg;base64,${mockPhotoBuffer.toString('base64')}`);
    });

    it('should use "me" as default user ID', async () => {
      // Mock a successful photo response for 'me'
      const mockPhotoResponse = {
        status: 200,
        value: Buffer.from('fakeImageData')
      };
      
      mockGraphClient.get.mockResolvedValueOnce(mockPhotoResponse);
      
      await profilePhotoService.getUserPhoto();
      
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/me/photo/$value');    });

    it('should return null when photo is not available', async () => {
      // Mock failed v1.0 endpoint response
      mockGraphClient.get.mockRejectedValueOnce({
        statusCode: 404,
        message: 'Photo not found'
      });

      // Mock global fetch for Exchange/Outlook failure
      global.fetch = jest.fn().mockRejectedValueOnce({
        statusCode: 404,
        message: 'Exchange photo not found'
      }) as jest.Mock;
      
      const result = await profilePhotoService.getUserPhoto('user123@example.com');
      
      expect(result).toBeNull();
      // Should try to resolve email to ID first
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user123@example.com');
      // Should try v1.0 endpoint for photo
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user123@example.com/photo/$value');
    });

    it('should try fallback methods when primary photo fetch fails', async () => {
      // V1.0 endpoint fails
      mockGraphClient.get.mockRejectedValueOnce({
        statusCode: 404,
        message: 'Photo not found'
      });
      
      // Mock Outlook endpoint success
      const mockFetchResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue({
          arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('base64EncodedImage123'))
        })
      };
      
      global.fetch = jest.fn().mockResolvedValueOnce(mockFetchResponse) as jest.Mock;
      
      const result = await profilePhotoService.getUserPhoto('user123@example.com');
      
      // Should try v1.0 endpoint first
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user123@example.com/photo/$value');      // Should fallback to Outlook endpoint when Graph API fails
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('outlook.office365.com/owa/service.svc/s/GetPersonaPhoto?email=user123%40example.com')
      );
      
      // Should return base64 encoded image from Outlook
      expect(result).toBe('data:image/jpeg;base64,YmFzZTY0RW5jb2RlZEltYWdlMTIz');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock an unexpected error
      mockGraphClient.get.mockRejectedValueOnce(new Error('Unexpected error'));
      mockGraphClient.get.mockRejectedValueOnce(new Error('Another error'));
      
      const result = await profilePhotoService.getUserPhoto('user123');
      
      expect(result).toBeNull();
    });
  });
    describe('caching', () => {
    beforeEach(() => {
      // Clear cache before each test
      profilePhotoService.clearCache();
      // Reset global fetch mock
      delete (global as any).fetch;
    });    it('should cache successful photo results', async () => {
      // Create a fresh service instance to avoid state pollution
      const freshService = new ProfilePhotoService(mockGraphClient);
      
      const mockPhotoBuffer = Buffer.from('fakeImageData');const expectedResult = `data:image/jpeg;base64,${mockPhotoBuffer.toString('base64')}`;
      
      // Clear any previous calls and reset all mocks
      jest.clearAllMocks();
      // Ensure a completely fresh cache
      profilePhotoService.clearCache();
      
      // Mock successful response for the API call
      mockGraphClient.get.mockResolvedValueOnce(mockPhotoBuffer);
        // First call should hit the API - use 'testuser1' (non-email ID)
      const result1 = await profilePhotoService.getUserPhoto('testuser1');
      expect(result1).toBe(expectedResult);
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/testuser1/photo/$value');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await profilePhotoService.getUserPhoto('testuser1');
      expect(result2).toBe(expectedResult);
      expect(mockGraphClient.get).toHaveBeenCalledTimes(1); // No additional API call
    });    it('should cache null results for failed requests', async () => {
      // Clear any previous mocks
      jest.clearAllMocks();
      // Ensure a completely fresh cache
      profilePhotoService.clearCache();
      
      // Mock all endpoints failing
      mockGraphClient.get.mockRejectedValue(new Error('Not found'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));
        // First call should try v1.0 endpoint and return null
      const result1 = await profilePhotoService.getUserPhoto('testuser2');
      expect(result1).toBeNull();
      
      // Second call should use cached null result
      const result2 = await profilePhotoService.getUserPhoto('testuser2');
      expect(result2).toBeNull();
      
      // Should only have made API calls once
      expect(mockGraphClient.get).toHaveBeenCalledTimes(1); // Only v1.0 endpoint
    });    it('should normalize user IDs for consistent caching', async () => {
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      const mockUserResponse = { id: 'resolved-user-id' };
      
      // Setup mocks for email resolution and photo fetch
      mockGraphClient.get
        .mockResolvedValueOnce(mockUserResponse)  // Email to ID resolution
        .mockResolvedValueOnce(mockPhotoBuffer);   // Photo fetch
      
      // Call with uppercase email
      await profilePhotoService.getUserPhoto('USER@EXAMPLE.COM');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(2); // ID resolution + photo fetch
      
      // Call with lowercase email should use cache (no additional API calls)
      await profilePhotoService.getUserPhoto('user@example.com');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(2); // Still same count
    });

    it('should clear cache for specific user', async () => {
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      mockGraphClient.get.mockResolvedValue(mockPhotoBuffer);
      
      // Cache a photo
      await profilePhotoService.getUserPhoto('user123');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(1);
      
      // Clear cache for this user
      profilePhotoService.clearUserCache('user123');
      
      // Next call should hit API again
      await profilePhotoService.getUserPhoto('user123');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      mockGraphClient.get.mockResolvedValue(mockPhotoBuffer);
      
      // Cache photos for multiple users
      await profilePhotoService.getUserPhoto('user1');
      await profilePhotoService.getUserPhoto('user2');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(2);
      
      // Clear all cache
      profilePhotoService.clearCache();
      
      // Next calls should hit API again
      await profilePhotoService.getUserPhoto('user1');
      await profilePhotoService.getUserPhoto('user2');
      expect(mockGraphClient.get).toHaveBeenCalledTimes(4);
    });

    it('should return cache statistics', async () => {
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      mockGraphClient.get.mockResolvedValue(mockPhotoBuffer);
      
      // Initially empty
      let stats = profilePhotoService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);
      expect(stats.entries).toHaveLength(0);
      
      // Cache a photo
      await profilePhotoService.getUserPhoto('user@example.com');
      
      stats = profilePhotoService.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].userId).toBe('user@example.com');
      expect(stats.entries[0].hasPhoto).toBe(true);
      expect(typeof stats.entries[0].age).toBe('number');
    });    it('should implement LRU eviction when cache is full', async () => {      const mockPhotoBuffer = Buffer.from('fakeImageData');
      // Setup mock to always succeed on first attempt (beta endpoint)
      mockGraphClient.get.mockResolvedValue(mockPhotoBuffer);
      
      // Mock max cache size to be small for testing
      const originalMaxSize = (profilePhotoService as any).MAX_CACHE_SIZE;
      (profilePhotoService as any).MAX_CACHE_SIZE = 2;
      
      try {
        // Fill cache to capacity
        await profilePhotoService.getUserPhoto('user1');
        await profilePhotoService.getUserPhoto('user2');
        
        // Check cache stats - should have 2 entries
        let stats = profilePhotoService.getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.entries.map(e => e.userId)).toContain('user1');
        expect(stats.entries.map(e => e.userId)).toContain('user2');
        
        // Adding third user should evict the least recently used (user1)
        await profilePhotoService.getUserPhoto('user3');
        
        // Check cache stats - should still have 2 entries, but user1 should be evicted
        stats = profilePhotoService.getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.entries.map(e => e.userId)).not.toContain('user1');
        expect(stats.entries.map(e => e.userId)).toContain('user2');
        expect(stats.entries.map(e => e.userId)).toContain('user3');
        
        // Access user2 to make it recently used
        await profilePhotoService.getUserPhoto('user2');
        
        // Add user4 - should evict user3 (now least recently used)
        await profilePhotoService.getUserPhoto('user4');
        
        stats = profilePhotoService.getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.entries.map(e => e.userId)).toContain('user2');
        expect(stats.entries.map(e => e.userId)).toContain('user4');
        expect(stats.entries.map(e => e.userId)).not.toContain('user3');
        
      } finally {
        // Restore original max size
        (profilePhotoService as any).MAX_CACHE_SIZE = originalMaxSize;
      }
    });

    it('should handle expired cache entries', async () => {
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      mockGraphClient.get.mockResolvedValue(mockPhotoBuffer);
      
      // Mock cache duration to be very short
      const originalDuration = (profilePhotoService as any).CACHE_DURATION;
      (profilePhotoService as any).CACHE_DURATION = 1; // 1 millisecond
      
      try {
        // Cache a photo
        await profilePhotoService.getUserPhoto('user123');
        expect(mockGraphClient.get).toHaveBeenCalledTimes(1);
        
        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Next call should hit API again due to expiration
        await profilePhotoService.getUserPhoto('user123');
        expect(mockGraphClient.get).toHaveBeenCalledTimes(2);
        
      } finally {
        // Restore original duration
        (profilePhotoService as any).CACHE_DURATION = originalDuration;
      }
    });
  });
});
