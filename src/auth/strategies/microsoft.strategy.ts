import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const callbackURL =
      configService.get<string>('MICROSOFT_REDIRECT_URI') ||
      'http://localhost:3001/api/auth/microsoft/callback';

    console.log('Microsoft OAuth callback URL:', callbackURL);

    super({
      authorizationURL: `https://login.microsoftonline.com/${configService.get<string>('MICROSOFT_TENANT_ID')}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${configService.get<string>('MICROSOFT_TENANT_ID')}/oauth2/v2.0/token`,
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL,
      scope: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'https://graph.microsoft.com/Mail.Read',
      ],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Record<string, unknown>,
  ) {
    // Store tokens for Microsoft Graph API access
    const tokens = {
      accessToken,
      refreshToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: (req as any).authInfo?.expires_in,
    };

    // You can fetch more user info from Microsoft Graph API here if needed
    // For now, we'll create a basic user profile
    // Using any here is acceptable as Microsoft profile structure varies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileObj = profile as Record<string, any>;
    const user = {
      email: profileObj.email || profileObj.upn || 'unknown@email.com',
      firstName:
        profileObj.givenName ||
        (profileObj.name && profileObj.name.givenName) ||
        'Unknown',
      lastName:
        profileObj.surname ||
        (profileObj.name && profileObj.name.familyName) ||
        'User',
      microsoftId: profileObj.oid || profileObj.id,
      tokens,
    };

    // You might want to save this user to your database or merge with existing user
    return this.authService.validateOrCreateMicrosoftUser(user);
  }
}
