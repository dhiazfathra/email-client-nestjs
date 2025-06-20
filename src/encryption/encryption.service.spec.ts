import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as CryptoJS from 'crypto-js';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;
  const testEncryptionKey = 'test-encryption-key';
  const testEncryptionSalt = 'test-encryption-salt';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'ENCRYPTION_KEY') {
                return testEncryptionKey;
              }
              if (key === 'ENCRYPTION_SALT') {
                return testEncryptionSalt;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should get encryption key and salt from config service', () => {
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_SALT');
    });

    it('should use default key if environment variable is not set', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const moduleWithDefaultKey: TestingModule =
        await Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn(() => undefined),
              },
            },
          ],
        }).compile();

      const serviceWithDefaultKey =
        moduleWithDefaultKey.get<EncryptionService>(EncryptionService);

      // Test encryption/decryption works with default key
      const testText = 'test-text';
      const encrypted = serviceWithDefaultKey.encrypt(testText);
      const decrypted = serviceWithDefaultKey.decrypt(encrypted);

      expect(decrypted).toBe(testText);
    });
  });

  describe('encrypt', () => {
    it('should encrypt a string value', () => {
      const testText = 'test-text';
      const encrypted = service.encrypt(testText);

      // Verify it's not the original text
      expect(encrypted).not.toBe(testText);

      // Verify the format contains IV (should have a colon separator)
      expect(encrypted).toContain(':');

      // Verify we can decrypt it back using the service
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(testText);
    });

    it('should return null when input is null', () => {
      expect(service.encrypt(null)).toBeNull();
    });

    it('should return null when input is undefined', () => {
      expect(service.encrypt(undefined)).toBeNull();
    });
  });

  describe('decrypt', () => {
    it('should decrypt a value encrypted with the service', () => {
      const testText = 'test-text';
      const encrypted = service.encrypt(testText);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(testText);
    });

    it('should handle legacy encrypted data without IV', () => {
      // Create legacy format encrypted data (without IV)
      const testText = 'test-text';

      // Mock the private derivedKey property to use the test key directly
      // This is a bit hacky but necessary for testing legacy format
      const legacyEncrypted = CryptoJS.AES.encrypt(
        testText,
        testEncryptionKey,
      ).toString();

      const decrypted = service.decrypt(legacyEncrypted);
      expect(decrypted).toBe(testText);
    });

    it('should return null when input is null', () => {
      expect(service.decrypt(null)).toBeNull();
    });

    it('should return null when input is undefined', () => {
      expect(service.decrypt(undefined)).toBeNull();
    });

    it('should return null when decryption fails', () => {
      const invalidEncrypted = 'invalid-encrypted-text';
      expect(service.decrypt(invalidEncrypted)).toBeNull();
    });
  });
});
