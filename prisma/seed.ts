import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Interface for email configuration
 */
interface EmailConfig {
  emailHost: string;
  imapPort: number;
  pop3Port: number;
  smtpPort: number;
  emailUsername: string;
  emailPassword: string;
  emailSecure: boolean;
  imapEnabled: boolean;
  smtpEnabled: boolean;
  pop3Enabled: boolean;
}

/**
 * Creates a user if they do not exist.
 *
 * @param email - The email of the user.
 * @param firstName - The first name of the user.
 * @param lastName - The last name of the user.
 * @param role - The role of the user.
 * @param hashedPassword - The hashed password of the user.
 * @param userType - The type of the user.
 * @param emailConfig - The email configuration for the user.
 * @returns The created user.
 */
async function createUserIfNotExists(
  email: string,
  firstName: string,
  lastName: string,
  role: Role,
  hashedPassword: string,
  userType: string,
  emailConfig?: EmailConfig,
) {
  let user = await prisma.user.findFirst({
    where: {
      email,
      isDeleted: false,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        ...(emailConfig && {
          emailHost: emailConfig.emailHost,
          imapPort: emailConfig.imapPort,
          pop3Port: emailConfig.pop3Port,
          smtpPort: emailConfig.smtpPort,
          emailUsername: emailConfig.emailUsername,
          emailPassword: emailConfig.emailPassword,
          emailSecure: emailConfig.emailSecure,
          imapEnabled: emailConfig.imapEnabled,
          smtpEnabled: emailConfig.smtpEnabled,
          pop3Enabled: emailConfig.pop3Enabled,
        }),
      },
    });
    console.log(`${userType} user created`);
  } else {
    console.log(`${userType} user already exists`);
  }

  return user;
}

/**
 * Seeds the database with an admin and a regular user, creating them if they do not exist.
 *
 * The users are initialized with predefined emails, names, roles, a securely hashed password,
 * and email configuration settings.
 *
 * @remark
 * If the users already exist, no updates are made to their records.
 */
async function main() {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('Password123!', saltRounds);

  // Email configuration for admin
  const adminEmailConfig: EmailConfig = {
    emailHost: 'smtp.gmail.com',
    imapPort: 993,
    pop3Port: 995,
    smtpPort: 465,
    emailUsername: 'admin@example.com',
    emailPassword: 'app-specific-password',
    emailSecure: true,
    imapEnabled: true,
    smtpEnabled: true,
    pop3Enabled: false,
  };

  // Email configuration for regular user
  const userEmailConfig: EmailConfig = {
    emailHost: 'smtp.gmail.com',
    imapPort: 993,
    pop3Port: 995,
    smtpPort: 465,
    emailUsername: 'user@example.com',
    emailPassword: 'app-specific-password',
    emailSecure: true,
    imapEnabled: true,
    smtpEnabled: true,
    pop3Enabled: true,
  };

  // Create admin user
  const admin = await createUserIfNotExists(
    'admin@example.com',
    'Admin',
    'User',
    Role.ADMIN,
    hashedPassword,
    'Admin',
    adminEmailConfig,
  );

  // Create regular user
  const user = await createUserIfNotExists(
    'user@example.com',
    'Regular',
    'User',
    Role.USER,
    hashedPassword,
    'User',
    userEmailConfig,
  );

  console.log({ admin, user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
