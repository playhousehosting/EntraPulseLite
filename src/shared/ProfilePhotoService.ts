// Enhanced implementation for fetching user profile photos from Microsoft Graph
import { Client } from '@microsoft/microsoft-graph-client';

/**
 * Improved method for fetching user profile photos from Microsoft Graph,
 * with multiple fallback mechanisms for better reliability
 */
export class ProfilePhotoService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Get a user's profile photo with multiple fallback mechanisms
   * @param userId User ID or email address
   * @returns Base64-encoded photo data URI or null if no photo available
   */
  async getUserPhoto(userId: string = 'me'): Promise<string | null> {
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
      
      // Attempt 1: Try beta endpoint
      try {
        console.log(`Trying to get photo for user ${userIdToUse} using beta endpoint`);
        const photoResponse = await this.client
          .api(`/beta/users/${userIdToUse}/photo/$value`)
          .responseType(ResponseType.ARRAYBUFFER)
          .get();
        
        // Convert the array buffer to a base64 string
        const base64 = Buffer.from(photoResponse).toString('base64');
        console.log('Photo obtained via beta endpoint');
        return `data:image/jpeg;base64,${base64}`;
      } catch (betaError: any) {
        console.log(`Beta endpoint photo fetch failed: ${betaError.message || 'Unknown error'}`);
      }
      
      // Attempt 2: Try v1.0 endpoint
      try {
        console.log('Trying standard v1.0 endpoint as fallback');
        const photoResponse = await this.client
          .api(`/users/${userIdToUse}/photo/$value`)
          .responseType(ResponseType.ARRAYBUFFER)
          .get();
        
        // Convert the array buffer to a base64 string
        const base64 = Buffer.from(photoResponse).toString('base64');
        console.log('Photo obtained via v1.0 endpoint');
        return `data:image/jpeg;base64,${base64}`;
      } catch (standardError: any) {
        console.log(`Standard endpoint photo fetch failed: ${standardError.message || 'Unknown error'}`);
      }
      
      // Attempt 3: Try direct profile photo from Exchange/Outlook
      // This often works when Graph API fails
      if (userId.includes('@') || userEmail.includes('@')) {
        const emailToUse = userId.includes('@') ? userId : userEmail;
        try {
          console.log(`Trying Exchange/Outlook endpoint for ${emailToUse}`);
          const photoResponse = await fetch(`https://outlook.office365.com/owa/service.svc/s/GetPersonaPhoto?email=${encodeURIComponent(emailToUse)}&UA=0&size=HR64x64`);
          
          if (photoResponse.ok) {
            const photoBlob = await photoResponse.blob();
            const arrayBuffer = await photoBlob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            console.log('Photo obtained via Exchange/Outlook endpoint');
            return `data:image/jpeg;base64,${base64}`;
          } else {
            console.log(`Exchange endpoint returned status: ${photoResponse.status}`);
          }
        } catch (outlookError: any) {
          console.log(`Exchange/Outlook endpoint failed: ${outlookError.message || 'Unknown error'}`);
        }
      }
      
      // All attempts failed
      console.log(`No photo available for user ${userId} after trying all methods`);
      return null;
    } catch (error: any) {
      console.error(`Failed to get user photo: ${error.message || 'Unknown error'}`);
      return null;
    }
  }
}
