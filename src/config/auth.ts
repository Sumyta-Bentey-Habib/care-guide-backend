import type { CookieOptions } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export const authConfig = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: '1d' as const,
  cookieName: 'doctor_tracker_token',
};

const isProduction = process.env.NODE_ENV === 'production';

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};
