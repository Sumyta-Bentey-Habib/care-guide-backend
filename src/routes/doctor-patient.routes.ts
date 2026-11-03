import { Router } from 'express';

import { getPatients, createPatient } from '../controllers/patient.controller.js';

import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';

import { createPatientSchema } from '../validators/patient.validator.js';

const router = Router({ mergeParams: true });

// Protect nested patient endpoints.
router.use(authenticate);

// GET /api/doctors/:doctorId/patients
router.get('/', getPatients);

// POST /api/doctors/:doctorId/patients
router.post('/', validate(createPatientSchema), createPatient);

export default router;
