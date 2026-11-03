import { Router } from 'express';

import { getDashboardStats } from '../controllers/dashboard.controller.js';
import authenticate from '../middlewares/auth.middleware.js';

const router = Router();

// Protect dashboard statistics.
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', getDashboardStats);

export default router;
