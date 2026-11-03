import type { Request, Response, NextFunction } from 'express';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';
import { authConfig, cookieOptions } from '../config/auth.js';

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find admin and explicitly include the hidden password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Compare submitted password with the stored bcrypt hash
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign({ sub: user._id.toString() }, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
    });

    // Store JWT in an HTTP-only cookie
    res.cookie(authConfig.cookieName, token, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(authConfig.cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
};
