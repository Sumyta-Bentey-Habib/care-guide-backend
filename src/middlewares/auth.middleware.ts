import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { authConfig } from '../config/auth.js';

// Make authenticated user ID available on Express requests
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Read JWT from the HTTP-only cookie
    const token = req.cookies?.[authConfig.cookieName];

    if (!token || typeof token !== 'string') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, authConfig.jwtSecret);

    // Ensure the token contains a valid user ID
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
      return;
    }

    // Attach authenticated user ID to the request
    req.userId = decoded.sub;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
  }
};

export default authenticate;
