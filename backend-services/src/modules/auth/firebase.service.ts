import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface GoogleIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly app: App | null;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    // .env stores the literal two-character sequence `\n` inside the quoted
    // private key (real newlines break most .env parsers), so it has to be
    // unescaped back into actual newlines before the SDK can use it.
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      this.app =
        getApps()[0] ??
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      this.app = null;
    }
  }

  isEnabled(): boolean {
    return this.app !== null;
  }

  async verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server.',
      );
    }

    let decoded;
    try {
      decoded = await getAuth(this.app).verifyIdToken(idToken);
    } catch (error) {
      this.logger.warn(`Firebase ID token verification failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Could not verify Google sign-in. Please try again.');
    }

    if (decoded.firebase?.sign_in_provider !== 'google.com') {
      throw new ServiceUnavailableException('Only Google sign-in is supported here.');
    }

    if (!decoded.email) {
      throw new ServiceUnavailableException('Google account has no email address.');
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified ?? false,
      name: (decoded.name as string) || decoded.email.split('@')[0],
      picture: decoded.picture as string | undefined,
    };
  }
}
