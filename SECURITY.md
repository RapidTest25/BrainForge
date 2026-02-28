# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| latest  | :white_check_mark: |
| < latest| :x:                |

We only support the latest version on the `main` branch. Please ensure you are running the most recent code before reporting a vulnerability.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by emailing the maintainers directly or through GitHub's private vulnerability reporting feature:

1. Go to the [Security tab](https://github.com/RapidTest25/BrainForge/security) of this repository
2. Click **"Report a vulnerability"**
3. Provide a detailed description of the issue

### What to include in your report

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix release**: As soon as possible, depending on severity

## Security Best Practices for Self-Hosting

### Environment Variables

- **Never** commit `.env` files to version control
- Use strong, unique values for `JWT_SECRET` and `JWT_REFRESH_SECRET` (minimum 32 characters)
- Rotate secrets periodically
- Use different secrets for development and production

### Database

- Use a strong, unique password for your PostgreSQL database
- Restrict database access to your API server only (do not expose port 5432 publicly)
- Enable SSL for database connections in production
- Regularly backup your database

### API Keys (BYOK)

- AI API keys are encrypted before storage in the database
- Keys are never logged or exposed in API responses
- Each user manages their own API keys — the system does not share keys between users
- Revoke and rotate API keys if you suspect they have been compromised

### Network

- Always use HTTPS in production
- Configure CORS to only allow your frontend domain
- Use a reverse proxy (nginx, Caddy) in front of the API server
- Enable rate limiting (already built-in via `@fastify/rate-limit`)

### Authentication

- Passwords are hashed with bcrypt (cost factor 10)
- JWTs have short expiration times with refresh token rotation
- Tokens are stored client-side only (no server-side sessions)

## Disclosure Policy

- We will work with you to understand and validate the vulnerability
- We will prepare a fix and coordinate disclosure
- We will credit reporters in the release notes (unless you prefer to remain anonymous)
- We ask that you give us reasonable time to address the issue before public disclosure

Thank you for helping keep BrainForge secure!
