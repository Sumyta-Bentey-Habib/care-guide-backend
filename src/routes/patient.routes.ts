import { Router } from 'express';

import {
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from '../controllers/patient.controller.js';

import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';

import { createPatientSchema, updatePatientSchema } from '../validators/patient.validator.js';

const router = Router();

// Protect every patient endpoint.
router.use(authenticate);

// GET /api/patients
router.get('/', getPatients);

// GET /api/patients/:id
router.get('/:id', getPatientById);

// PUT /api/patients/:id
router.put('/:id', validate(updatePatientSchema), updatePatient);

// DELETE /api/patients/:id
router.delete('/:id', deletePatient);

// POST /api/doctors/:doctorId/patients
// GET /api/doctors/:doctorId/patients
// These nested routes are mounted separately in app.ts.

export default router;
