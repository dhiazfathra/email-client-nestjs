import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as CryptoJS from 'crypto-js';
import { EncryptionService } from './encryption.service';

describe('EncryptionService Error Handling', () => {
  let service: EncryptionService;
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
  });

  describe('encrypt error handling', () => {
    it('should return null when encryption throws an error', () => {
      // Mock CryptoJS.AES.encrypt to throw an error
      const originalEncrypt = CryptoJS.AES.encrypt;
      CryptoJS.AES.encrypt = jest.fn().mockImplementation(() => {
        throw new Error('Encryption error');
      });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        const result = service.encrypt('test-text');
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Encryption error:',
          'Encryption error',
        );
      } finally {
        // Restore original function
        CryptoJS.AES.encrypt = originalEncrypt;
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('decrypt error handling', () => {
    it('should return null when decryption throws an error', () => {
      // Mock CryptoJS.AES.decrypt to throw an error
      const originalDecrypt = CryptoJS.AES.decrypt;
      CryptoJS.AES.decrypt = jest.fn().mockImplementation(() => {
        throw new Error('Decryption error');
      });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        const result = service.decrypt('iv:encrypted');
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Decryption error:',
          'Decryption error',
        );
      } finally {
        // Restore original function
        CryptoJS.AES.decrypt = originalDecrypt;
        consoleErrorSpy.mockRestore();
      }
    });

    it('should return null when decrypted bytes cannot be converted to string', () => {
      // Mock CryptoJS.AES.decrypt to return invalid bytes
      const originalDecrypt = CryptoJS.AES.decrypt;
      const mockWordArray = {
        toString: jest.fn().mockReturnValue(''),
      };
      CryptoJS.AES.decrypt = jest.fn().mockReturnValue(mockWordArray);

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        const result = service.decrypt('iv:encrypted');
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Decryption error:',
          'Decryption failed - invalid data or key',
        );
      } finally {
        // Restore original function
        CryptoJS.AES.decrypt = originalDecrypt;
        consoleErrorSpy.mockRestore();
      }
    });

    it('should return null when legacy decryption fails', () => {
      // Mock CryptoJS.AES.decrypt for legacy format
      const originalDecrypt = CryptoJS.AES.decrypt;
      const mockWordArray = {
        toString: jest.fn().mockReturnValue(''),
      };
      CryptoJS.AES.decrypt = jest.fn().mockReturnValue(mockWordArray);

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        const result = service.decrypt('encrypted-without-iv');
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Decryption error:',
          'Legacy decryption failed - invalid data or key',
        );
      } finally {
        // Restore original function
        CryptoJS.AES.decrypt = originalDecrypt;
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
