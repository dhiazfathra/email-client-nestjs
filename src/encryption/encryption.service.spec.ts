import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as CryptoJS from 'crypto-js';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;
  const testEncryptionKey = 'test-encryption-key';

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
    it('should get encryption key from config service', () => {
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
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

      // Verify we can decrypt it back
      const bytes = CryptoJS.AES.decrypt(encrypted, testEncryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
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
    it('should decrypt an encrypted string value', () => {
      const testText = 'test-text';
      const encrypted = CryptoJS.AES.encrypt(
        testText,
        testEncryptionKey,
      ).toString();

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(testText);
    });

    it('should return null when input is null', () => {
      expect(service.decrypt(null)).toBeNull();
    });

    it('should return null when input is undefined', () => {
      expect(service.decrypt(undefined)).toBeNull();
    });
  });
});
