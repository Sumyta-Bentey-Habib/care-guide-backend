import { Router } from 'express';

import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from '../controllers/patient.controller.js';

import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';

import { createPatientSchema, updatePatientSchema } from '../validators/patient.validator.js';

const router = Router({ mergeParams: true });

// Protect nested patient endpoints.
router.use(authenticate);

// GET /api/doctors/:doctorId/patients
router.get('/', getPatients);

// POST /api/doctors/:doctorId/patients
router.post('/', validate(createPatientSchema), createPatient);

// GET /api/doctors/:doctorId/patients/:patientId
router.get('/:patientId', getPatientById);

// PUT /api/doctors/:doctorId/patients/:patientId
router.put('/:patientId', validate(updatePatientSchema), updatePatient);

// DELETE /api/doctors/:doctorId/patients/:patientId
router.delete('/:patientId', deletePatient);

export default router;
