# Implementing Soft Delete with Partial Index in Prisma

This guide explains how to implement soft delete functionality in your Prisma schema with a partial index, which is not directly supported by Prisma schema but can be added through a custom migration.

## Step 1: Update the Prisma Schema

First, add the `isDeleted` field to your model:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  firstName String?
  lastName  String?
  role      Role     @default(USER)
  isDeleted Boolean  @default(false) // Add this field
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isDeleted]) // Regular index for query performance
}
```

## Step 2: Create a Migration Without Applying It

Run the following command to create a migration without applying it:

```bash
npx prisma migrate dev --create-only --name add_soft_delete_to_user
```

## Step 3: Customize the Migration

Open the generated migration file in `prisma/migrations/[timestamp]_add_soft_delete_to_user/migration.sql` and add the partial index after the existing SQL statements:

```sql
-- Add this at the end of the migration file
CREATE UNIQUE INDEX "User_email_where_not_deleted" ON "User"("email") WHERE ("isDeleted" = false);
```

This creates a partial unique index on the email field that only applies to non-deleted users. This allows:

- Deleted users to have duplicate emails (since they're soft-deleted)
- Active users to maintain email uniqueness

## Step 4: Apply the Migration

Run the following command to apply the modified migration:

```bash
npx prisma migrate dev
```

## Step 5: Update Your Application Logic

When querying for users, always include a filter for non-deleted users:

```typescript
// Find all non-deleted users
const users = await prisma.user.findMany({
  where: {
    isDeleted: false
  }
});

// Find a specific non-deleted user
const user = await prisma.user.findFirst({
  where: {
    id: userId,
    isDeleted: false
  }
});
```

For soft-deleting users, update the `isDeleted` field instead of actually deleting the record:

```typescript
// Soft delete a user
await prisma.user.update({
  where: { id: userId },
  data: { isDeleted: true }
});
```

## Important Notes

1. Prisma doesn't natively support partial indexes in the schema, which is why we need to customize the migration.
2. The partial index ensures email uniqueness only among active users.
3. Remember to always filter by `isDeleted: false` in your queries to exclude soft-deleted records.
4. When creating new users, Prisma will still check the regular `@unique` constraint on email, but the partial index will allow reusing emails of deleted users.

## Troubleshooting

If you encounter issues with the unique constraint when trying to create a user with an email that belongs to a deleted user, you may need to:

1. Remove the `@unique` attribute from the email field in your schema
2. Rely solely on the partial index for uniqueness
3. Create a custom validation in your application logic to ensure email uniqueness among active users
