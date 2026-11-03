import { Router } from 'express';

import { login, logout, getMe } from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.middleware.js';
import authenticate from '../middlewares/auth.middleware.js';
import { loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Public route: Admin login
router.post('/login', validate(loginSchema), login);

// Protected route: Admin logout
router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getMe);

export default router;
