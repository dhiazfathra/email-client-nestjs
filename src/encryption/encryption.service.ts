import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    // Get encryption key from environment variables
    this.encryptionKey =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      // Fallback to a default key (not recommended for production)
      'default-encryption-key-change-in-production';
  }

  /**
   * Encrypts a string value
   * @param text The plain text to encrypt
   * @returns The encrypted text
   */
  encrypt(text: string | null | undefined): string | null {
    if (text === null || text === undefined) {
      return null;
    }
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  /**
   * Decrypts an encrypted string value
   * @param encryptedText The encrypted text to decrypt
   * @returns The decrypted plain text
   */
  decrypt(encryptedText: string | null | undefined): string | null {
    if (encryptedText === null || encryptedText === undefined) {
      return null;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
