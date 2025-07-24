import {
  AuthorizationCodeRequest,
  AuthorizationUrlRequest,
  ConfidentialClientApplication,
  CryptoProvider,
} from '@azure/msal-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import { Request } from 'express';
import { Strategy } from 'passport';
import { AuthService } from '../auth.service';

// Extend Express Request to include session
declare module 'express-session' {
  interface SessionData {
    pkceCodes?: {
      verifier: string;
      challenge: string;
      state: string;
    };
  }
}

/**
 * Custom Microsoft authentication strategy using MSAL directly
 * This replaces the passport-oauth2 implementation for improved security
 */
@Injectable()
export class MicrosoftMsalStrategy extends PassportStrategy(
  Strategy,
  'microsoft',
) {
  // Implement the required validate method from PassportStrategy
  // This is not used directly in our implementation but is required by the interface
  validate(): unknown {
    // The actual validation happens in the authenticate method
    return null;
  }

  private readonly logger = new Logger(MicrosoftMsalStrategy.name);
  private msalClient: ConfidentialClientApplication;
  private cryptoProvider: CryptoProvider;
  private readonly scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    'https://graph.microsoft.com/Mail.Read',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super();

    this.cryptoProvider = new CryptoProvider();
    this.initializeMsalClient();
  }

  private initializeMsalClient(): void {
    try {
      const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'MICROSOFT_CLIENT_SECRET',
      );
      const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID');
      const authority = `https://login.microsoftonline.com/${tenantId}`;

      if (!clientId || !clientSecret || !tenantId) {
        this.logger.error('Microsoft credentials are not properly configured');
        return;
      }

      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId,
          clientSecret,
          authority,
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
   * Override the authenticate method from Passport Strategy
   */
  async authenticate(req: Request, _options?: unknown): Promise<void> {
    try {
      // Check if this is a callback request with both code and state parameters
      // Both parameters are required for a valid OAuth callback
      if (req.query.code && req.query.state && req.session.pkceCodes?.state) {
        // Handle the callback with authorization code
        await this.handleCallback(req);
      } else {
        // Initiate the authorization flow
        await this.initiateAuthFlow(req);
      }
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      this.fail(error);
    }
  }

  /**
   * Initiate the authorization flow by redirecting to Microsoft login
   */
  private async initiateAuthFlow(req: Request): Promise<void> {
    try {
      // Generate PKCE code verifier and challenge
      const { verifier, challenge } =
        await this.cryptoProvider.generatePkceCodes();

      // Generate a random state for CSRF protection
      const state = randomBytes(16).toString('hex');

      // Store the PKCE verifier in session for later use
      req.session.pkceCodes = {
        verifier,
        challenge,
        state,
      };

      const callbackURL =
        this.configService.get<string>('MICROSOFT_REDIRECT_URI') ||
        'http://localhost:3001/api/auth/microsoft/callback';

      const authUrlParameters: AuthorizationUrlRequest = {
        scopes: this.scopes,
        redirectUri: callbackURL,
        responseMode: 'query',
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        state: req.session.pkceCodes.state,
      };

      // Get the authorization URL
      const authUrl = await this.msalClient.getAuthCodeUrl(authUrlParameters);

      // Redirect to Microsoft login page
      this.redirect(authUrl);
    } catch (error) {
      this.logger.error(
        `Failed to initiate auth flow: ${error.message}`,
        error.stack,
      );
      this.fail(error);
    }
  }

  /**
   * Handle the callback from Microsoft with the authorization code
   */
  private async handleCallback(req: Request): Promise<void> {
    try {
      // Verify state parameter to prevent CSRF attacks
      if (req.query.state !== req.session.pkceCodes?.state) {
        throw new Error('State parameter mismatch');
      }

      const callbackURL =
        this.configService.get<string>('MICROSOFT_REDIRECT_URI') ||
        'http://localhost:3001/api/auth/microsoft/callback';

      // Exchange the authorization code for tokens
      const tokenRequest: AuthorizationCodeRequest = {
        code: req.query.code as string,
        scopes: this.scopes,
        redirectUri: callbackURL,
        codeVerifier: req.session.pkceCodes.verifier,
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);

      if (!response) {
        throw new Error('Failed to acquire token');
      }

      // Extract user information from ID token claims
      const idTokenClaims = response.idTokenClaims as Record<string, string>;

      // Create user object from token claims
      const user = {
        email:
          idTokenClaims.preferred_username ||
          idTokenClaims.email ||
          'unknown@email.com',
        firstName: idTokenClaims.given_name || 'Unknown',
        lastName: idTokenClaims.family_name || 'User',
        microsoftId: idTokenClaims.oid || idTokenClaims.sub,
        tokens: {
          accessToken: response.accessToken,
          // MSAL Node doesn't always return a refreshToken in the response
          refreshToken: response.account?.homeAccountId || '',
          expiresIn: response.expiresOn?.getTime(),
        },
      };

      // Validate or create the user in the database
      const validatedUser =
        await this.authService.validateOrCreateMicrosoftUser(user);

      // Complete the authentication
      this.success(validatedUser);
    } catch (error) {
      this.logger.error(
        `Failed to handle callback: ${error.message}`,
        error.stack,
      );
      this.fail(error);
    }
  }
}
