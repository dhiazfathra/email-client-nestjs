# Deno Support for Email Client NestJS

This project now supports deployment using Deno and deno deployctl. This document explains how to use the Deno integration.

## Prerequisites

1. Install Deno:
   ```bash
   # macOS, Linux
   curl -fsSL https://deno.land/x/install/install.sh | sh
   
   # Windows (PowerShell)
   irm https://deno.land/install.ps1 | iex
   ```

2. Install deployctl:
   ```bash
   deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
   ```

3. Log in to Deno Deploy:
   ```bash
   deployctl login
   ```

## Local Development with Deno

To run the application locally using Deno:

```bash
deno task dev
```

This will start the application in watch mode, automatically reloading when files change.

## Deployment to Deno Deploy

To deploy the application to Deno Deploy:

```bash
deno task deploy
```

Alternatively, you can use deployctl directly:

```bash
deployctl deploy --project=email-client-nestjs --entrypoint=src/deno-main.ts
```

## Configuration

The Deno configuration is defined in the following files:

- `deno.json`: Contains Deno-specific configuration, import maps, and tasks
- `deployctl.json`: Contains deployment configuration for Deno Deploy
- `src/deno-main.ts`: Deno-compatible entry point for the NestJS application

### Import Maps

The `deno.json` file includes import maps for Node.js modules and npm packages. This allows Deno to resolve imports correctly:

```json
"imports": {
  "@nestjs/common": "npm:@nestjs/common@11.1.5",
  "crypto": "node:crypto",
  "bcrypt": "npm:bcrypt@5.1.1"
  // ... other imports
}
```

### Auto-Installation of npm Packages

The `deno.json` file includes the `"nodeModulesDir": "auto"` setting, which enables automatic installation of npm packages when they are imported. This simplifies dependency management when running with Deno.

## Environment Variables

When running in Deno Deploy, you'll need to set up environment variables through the Deno Deploy dashboard. The following environment variables are used:

- `PORT`: The port to listen on (defaults to 8000)
- `SESSION_SECRET`: Secret for session management
- `DENO_ENV`: Set to 'production' for production environments

## Limitations

The Deno version has some limitations compared to the Node.js version:

1. Some Node.js-specific features are simplified or mocked
2. Database access through Prisma requires special handling in Deno
3. Some npm packages may not be fully compatible with Deno's npm compatibility layer

## Troubleshooting

If you encounter issues with the Deno deployment:

1. When running locally with `--unstable-sloppy-imports` flag, you don't need to add `.ts` extensions to imports
2. Verify that all required npm packages are listed in the `imports` section of `deno.json`
3. For Node.js built-in modules like `crypto`, use the `node:` prefix in the import map (e.g., `"crypto": "node:crypto"`)
4. Make sure environment variables are properly configured in Deno Deploy
5. If npm packages are missing, ensure `"nodeModulesDir": "auto"` is set in `deno.json`
6. Check the Deno Deploy logs for specific error messages
7. The first run may take some time as Deno downloads and installs all npm dependencies
