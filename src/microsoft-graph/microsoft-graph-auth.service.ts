import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'isomorphic-fetch';

@Injectable()
export class MicrosoftGraphAuthService {
  private readonly logger = new Logger(MicrosoftGraphAuthService.name);
  private msalClient: ConfidentialClientApplication;
  private readonly scopes = ['https://graph.microsoft.com/.default'];

  constructor(private readonly configService: ConfigService) {
    this.initializeMsalClient();
  }

  private initializeMsalClient(): void {
    try {
      const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'MICROSOFT_CLIENT_SECRET',
      );
      const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID');

      if (!clientId || !clientSecret || !tenantId) {
        this.logger.error(
          'Microsoft Graph credentials are not properly configured',
        );
        return;
      }

      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId,
          clientSecret,
          authority: `https://login.microsoftonline.com/${tenantId}`,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize MSAL client: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get an access token for Microsoft Graph API
   */
  async getAccessToken(): Promise<string> {
    try {
      const result = await this.msalClient.acquireTokenByClientCredential({
        scopes: this.scopes,
      });

      if (!result?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      return result.accessToken;
    } catch (error) {
      this.logger.error(
        `Failed to get access token: ${error.message}`,
        error.stack,
      );
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Create an authenticated Microsoft Graph client
   */
  async getAuthenticatedClient(): Promise<Client> {
    try {
      const accessToken = await this.getAccessToken();

      return Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create authenticated client: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to create authenticated client: ${error.message}`,
      );
    }
  }
}
