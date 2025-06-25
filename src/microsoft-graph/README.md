# Microsoft Graph (Outlook) Integration

This module provides integration with Microsoft Graph API for sending and receiving emails through Outlook in the NestJS email client application.

## Setup Instructions

### 1. Register an Application in Azure Portal

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory → App registrations → New registration
3. Register your app with the following details:
   - Name: Email Client NestJS
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: Web → http://localhost:3000/api/auth/microsoft/callback

4. After registration, note down the following values:
   - Application (client) ID
   - Directory (tenant) ID

5. Create a client secret:
   - Go to Certificates & secrets → Client secrets → New client secret
   - Provide a description and select an expiration period
   - Copy the generated secret value (it will only be shown once)

6. Configure API permissions:
   - Go to API permissions → Add a permission → Microsoft Graph → Delegated permissions
   - Add the following permissions:
     - Mail.Read
     - Mail.ReadWrite
     - Mail.Send
     - User.Read
   - Click "Grant admin consent" if you have admin rights

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

### 3. Enable Microsoft Graph for a User

To enable Microsoft Graph for a user, update their record in the database:

```sql
UPDATE "User" SET "microsoftGraphEnabled" = true WHERE id = 'your-user-id';
```

Alternatively, you can update the user's email configuration through the API.

## Usage

### Sending Emails

The email service will automatically use Microsoft Graph API for sending emails if `microsoftGraphEnabled` is set to `true` for the user.

```typescript
// Example of sending an email
const emailData = new SendEmailDto();
emailData.to = ['recipient@example.com'];
emailData.subject = 'Test Email';
emailData.text = 'This is a test email.';
emailData.html = '<p>This is a test email.</p>';

const sentEmail = await emailService.sendEmail(userId, emailData);
```

### Receiving Emails

The email service will automatically use Microsoft Graph API for fetching emails if `microsoftGraphEnabled` is set to `true` for the user.

```typescript
// Example of fetching emails
const options = new GetEmailsDto();
options.folder = 'inbox';
options.limit = 10;
options.page = 1;

const receivedEmails = await emailService.fetchEmails(userId, options);
```

## Testing

You can test the Microsoft Graph integration using the provided test script:

```bash
# Compile the TypeScript file
npx ts-node src/microsoft-graph/test-outlook.ts
```

Make sure to replace `'your-user-id'` in the test script with an actual user ID from your database that has Microsoft Graph enabled.

## Troubleshooting

1. **Authentication Errors**: Ensure that your client ID, client secret, and tenant ID are correct.
2. **Permission Errors**: Make sure you've granted the necessary permissions in the Azure portal.
3. **User Configuration**: Verify that the user has `microsoftGraphEnabled` set to `true`.
4. **Logs**: Check the application logs for detailed error messages.

## References

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/api/overview)
- [Microsoft Graph JavaScript SDK](https://github.com/microsoftgraph/msgraph-sdk-javascript)
- [MSAL Node.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
