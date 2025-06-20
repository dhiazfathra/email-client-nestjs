# Encryption Service

## Overview

The Encryption Service provides secure two-way encryption for sensitive data while addressing CWE-916 (Use of Password Hash With Insufficient Computational Effort). This implementation uses AES encryption with a key derived using PBKDF2, adding significant computational effort to make brute-force attacks impractical.

## Security Features

1. **Key Derivation Function (PBKDF2)**
   - Uses 10,000 iterations (configurable)
   - SHA-256 hashing algorithm
   - Derives a 256-bit key from the master key

2. **Per-Encryption Initialization Vector (IV)**
   - Generates a random IV for each encryption operation
   - Stores the IV with the ciphertext (format: `iv:ciphertext`)
   - Prevents pattern analysis attacks

3. **Secure AES Configuration**
   - Uses AES-256 in CBC mode
   - PKCS7 padding
   - Proper error handling

4. **Backward Compatibility**
   - Supports decryption of legacy encrypted data (without IV)

## Configuration

The service requires the following environment variables:

```
ENCRYPTION_KEY=your-secure-master-key
ENCRYPTION_SALT=your-secure-salt-value
```

For production environments:
- Use a strong, randomly generated master key (at least 32 characters)
- Use a strong, randomly generated salt (at least 16 characters)
- Store these values securely in environment variables or a secrets manager
- Rotate keys periodically according to your security policy

## Usage

```typescript
// Inject the service
constructor(private encryptionService: EncryptionService) {}

// Encrypt sensitive data
const encrypted = this.encryptionService.encrypt('sensitive-data');

// Decrypt when needed
const decrypted = this.encryptionService.decrypt(encrypted);
```

## CWE-916 Compliance

This implementation addresses CWE-916 by:

1. Using a slow key derivation function (PBKDF2) with high iteration count
2. Adding significant computational complexity to the key derivation process
3. Making brute-force attacks against the encryption key prohibitively expensive

While CWE-916 typically applies to password hashing (one-way), this implementation applies the same principles to two-way encryption by ensuring the master key is protected with sufficient computational effort.
