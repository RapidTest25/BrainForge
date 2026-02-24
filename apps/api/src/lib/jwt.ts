import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-chars!!');
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-min-32-chars!');

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export async function generateAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRY)
    .sign(ACCESS_SECRET);
}

export async function generateRefreshToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return payload as TokenPayload;
}

export async function generateTokens(userId: string, email: string) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, email),
    generateRefreshToken(userId, email),
  ]);
  return { accessToken, refreshToken };
}
