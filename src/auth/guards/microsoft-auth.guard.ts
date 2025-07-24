import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for Microsoft MSAL-based authentication
 * Uses the 'microsoft' strategy name which is now implemented by MicrosoftMsalStrategy
 */
@Injectable()
export class MicrosoftAuthGuard extends AuthGuard('microsoft') {
  constructor() {
    super();
  }
}
