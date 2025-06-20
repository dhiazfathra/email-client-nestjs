import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly masterKey: string;
  private readonly salt: string;
  private readonly derivedKey: CryptoJS.lib.WordArray;

  // PBKDF2 configuration for high computational effort
  private readonly iterations = 10000; // High number of iterations for computational effort
  private readonly keySize = 256 / 32; // 256 bits key size

  constructor(private configService: ConfigService) {
    // Get master key from environment variables
    this.masterKey =
      this.configService.get<string>('ENCRYPTION_KEY') ??
      'default-encryption-key';

    // Use a fixed salt from config or generate one
    this.salt =
      this.configService.get<string>('ENCRYPTION_SALT') ??
      CryptoJS.lib.WordArray.random(128 / 8).toString();

    // Derive the encryption key using PBKDF2 with high computational effort
    this.derivedKey = this.deriveKey(this.masterKey, this.salt);
  }

  /**
   * Derives a cryptographic key using PBKDF2 with high computational effort
   * @param masterKey The master key to derive from
   * @param salt The salt to use for derivation
   * @returns The derived key as a WordArray
   */
  private deriveKey(masterKey: string, salt: string): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(masterKey, salt, {
      keySize: this.keySize,
      iterations: this.iterations,
      hasher: CryptoJS.algo.SHA256,
    });
  }

  /**
   * Encrypts a string value with a random IV and the derived key
   * @param text The plain text to encrypt
   * @returns The encrypted text with IV prepended
   */
  encrypt(text: string | null | undefined): string | null {
    if (text === null || text === undefined) {
      return null;
    }

    try {
      // Generate a random IV for each encryption
      const iv = CryptoJS.lib.WordArray.random(128 / 8);

      // Encrypt with AES using the derived key and random IV
      const encrypted = CryptoJS.AES.encrypt(text, this.derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Combine IV and ciphertext for storage
      // Format: iv:ciphertext
      return iv.toString() + ':' + encrypted.toString();
    } catch (error) {
      console.error('Encryption error:', error.message);
      return null;
    }
  }

  /**
   * Decrypts an encrypted string value using the derived key and embedded IV
   * @param encryptedText The encrypted text to decrypt (format: iv:ciphertext)
   * @returns The decrypted plain text
   */
  decrypt(encryptedText: string | null | undefined): string | null {
    if (encryptedText === null || encryptedText === undefined) {
      return null;
    }

    try {
      // Split the IV and ciphertext
      const textParts = encryptedText.split(':');

      // Handle legacy encrypted data that doesn't have IV
      if (textParts.length === 1) {
        // Legacy decryption for backward compatibility
        const bytes = CryptoJS.AES.decrypt(encryptedText, this.masterKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
          throw new Error('Legacy decryption failed - invalid data or key');
        }
        return decrypted;
      }

      const iv = CryptoJS.enc.Hex.parse(textParts[0]);
      const ciphertext = textParts[1];

      // Decrypt with AES using the derived key and extracted IV
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption failed - invalid data or key');
      }

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return null;
    }
  }
}
