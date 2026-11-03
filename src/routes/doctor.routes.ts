import { Router } from 'express';

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctor.controller.js';

import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';

import { createDoctorSchema, updateDoctorSchema } from '../validators/doctor.validator.js';

const router = Router();

// Protect every doctor endpoint.
router.use(authenticate);

// GET /api/doctors
// POST /api/doctors
router.route('/').get(getDoctors).post(validate(createDoctorSchema), createDoctor);

// GET /api/doctors/:id
// PUT /api/doctors/:id
// DELETE /api/doctors/:id
router
  .route('/:id')
  .get(getDoctorById)
  .put(validate(updateDoctorSchema), updateDoctor)
  .delete(deleteDoctor);

export default router;
