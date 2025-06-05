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
    profilePhotoService = new ProfilePhotoService(mockGraphClient);
  });
  describe('getUserPhoto', () => {
    it('should fetch a user photo successfully', async () => {
      // Mock a successful photo response
      const mockPhotoBuffer = Buffer.from('fakeImageData');
      
      // First call fails (beta endpoint)
      mockGraphClient.get.mockRejectedValueOnce(new Error('Not found'));
      
      // Second call succeeds (v1.0 endpoint)
      mockGraphClient.get.mockResolvedValueOnce(mockPhotoBuffer);
      
      const result = await profilePhotoService.getUserPhoto('user123');
      
      // Should have tried beta endpoint first
      expect(mockGraphClient.api).toHaveBeenCalledWith('/beta/users/user123/photo/$value');
      // Should have tried v1.0 endpoint as fallback
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
      
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/me/photo/$value');
    });    it('should return null when photo is not available', async () => {
      // Mock a failed beta endpoint response
      mockGraphClient.get.mockRejectedValueOnce({
        statusCode: 404,
        message: 'Photo not found'
      });
      
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
      // Should try beta endpoint first
      expect(mockGraphClient.api).toHaveBeenCalledWith('/beta/users/user123@example.com/photo/$value');
      // Should try v1.0 endpoint second
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user123@example.com/photo/$value');
    });    it('should try fallback methods when primary photo fetch fails', async () => {
      // Beta endpoint fails
      mockGraphClient.get.mockRejectedValueOnce({
        statusCode: 404,
        message: 'Photo not found'
      });
      
      // v1.0 endpoint fails
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
      
      // Should try beta endpoint first
      expect(mockGraphClient.api).toHaveBeenCalledWith('/beta/users/user123@example.com/photo/$value');
      // Should try v1.0 endpoint second
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user123@example.com/photo/$value');
      // Should have made fetch call as final fallback
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('outlook.office365.com')
      );
      
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock an unexpected error
      mockGraphClient.get.mockRejectedValueOnce(new Error('Unexpected error'));
      mockGraphClient.get.mockRejectedValueOnce(new Error('Another error'));
      
      const result = await profilePhotoService.getUserPhoto('user123');
      
      expect(result).toBeNull();
    });
  });
});
