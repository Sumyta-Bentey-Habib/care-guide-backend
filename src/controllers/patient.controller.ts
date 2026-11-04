import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import Patient from '../models/patient.model.js';
import Doctor from '../models/doctor.model.js';

// Escape special regex characters in search input.
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Explicit MongoDB query filter type.
// Separate from the Patient document interface.
type PatientFilter = {
  doctorId?: mongoose.Types.ObjectId;
  $or?: Array<{
    name?: RegExp;
    phone?: RegExp;
    condition?: RegExp;
  }>;
  condition?: RegExp;
  createdAt?: {
    $gte?: Date;
    $lt?: Date;
  };
};

// Validate route parameters as strings.
const getRouteParam = (value: string | string[] | undefined): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null;
};

// GET /api/patients
// GET /api/doctors/:doctorId/patients
// Supports search, condition filtering, date filtering, and pagination.
export const getPatients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const condition = typeof req.query.condition === 'string' ? req.query.condition.trim() : '';

    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '';

    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '';

    const requestedPage = Number(req.query.page);
    const requestedLimit = Number(req.query.limit);

    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 10;

    const filter: PatientFilter = {};

    // Optional doctor-specific filtering.
    const doctorId = getRouteParam(req.params.doctorId);

    if (req.params.doctorId !== undefined) {
      if (!doctorId || !mongoose.isValidObjectId(doctorId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid doctor ID',
        });
        return;
      }

      filter.doctorId = new mongoose.Types.ObjectId(doctorId);
    }

    // Search by patient name, phone, and condition.
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');

      filter.$or = [{ name: searchRegex }, { phone: searchRegex }, { condition: searchRegex }];
    }

    // Filter by patient condition.
    if (condition) {
      filter.condition = new RegExp(escapeRegex(condition), 'i');
    }

    // Filter by patient creation date.
    if (startDate || endDate) {
      const dateFilter: {
        $gte?: Date;
        $lt?: Date;
      } = {};

      if (startDate) {
        const parsedStartDate = new Date(startDate);

        if (
          Number.isNaN(parsedStartDate.getTime()) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
          parsedStartDate.toISOString().slice(0, 10) !== startDate
        ) {
          res.status(400).json({
            success: false,
            message: 'Invalid startDate. Use YYYY-MM-DD format.',
          });
          return;
        }

        dateFilter.$gte = parsedStartDate;
      }

      if (endDate) {
        const parsedEndDate = new Date(endDate);

        if (
          Number.isNaN(parsedEndDate.getTime()) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
          parsedEndDate.toISOString().slice(0, 10) !== endDate
        ) {
          res.status(400).json({
            success: false,
            message: 'Invalid endDate. Use YYYY-MM-DD format.',
          });
          return;
        }

        // Include the complete end date.
        parsedEndDate.setUTCDate(parsedEndDate.getUTCDate() + 1);
        dateFilter.$lt = parsedEndDate;
      }

      if (dateFilter.$gte && dateFilter.$lt && dateFilter.$gte >= dateFilter.$lt) {
        res.status(400).json({
          success: false,
          message: 'startDate must be before or equal to endDate',
        });
        return;
      }

      filter.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [patients, totalPatients] = await Promise.all([
      Patient.find(filter)
        .populate('doctorId', 'name specialization hospital')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Patient.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        currentPage: page,
        limit,
        totalPatients,
        totalPages: Math.ceil(totalPatients / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/doctors/:doctorId/patients
// Create a patient under a specific doctor.
export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getRouteParam(req.params.doctorId);

    if (!doctorId || !mongoose.isValidObjectId(doctorId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    const patient = await Patient.create({
      ...req.body,
      doctorId: doctor._id,
    });

    const populatedPatient = await Patient.findById(patient._id)
      .populate('doctorId', 'name specialization hospital')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: populatedPatient,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/patients/:id
// GET /api/doctors/:doctorId/patients/:patientId
// Retrieve one patient by ID.
export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getRouteParam(req.params.doctorId);
    const id = getRouteParam(req.params.patientId || req.params.id);

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid patient ID',
      });
      return;
    }

    if (doctorId && !mongoose.isValidObjectId(doctorId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const query: { _id: string; doctorId?: string } = { _id: id };
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const patient = await Patient.findOne(query)
      .populate('doctorId', 'name specialization hospital')
      .lean();

    if (!patient) {
      res.status(404).json({
        success: false,
        message: doctorId
          ? 'Patient not found under this doctor'
          : 'Patient not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/patients/:id
// PUT /api/doctors/:doctorId/patients/:patientId
// Update existing patient information.
export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getRouteParam(req.params.doctorId);
    const id = getRouteParam(req.params.patientId || req.params.id);

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid patient ID',
      });
      return;
    }

    if (doctorId && !mongoose.isValidObjectId(doctorId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const query: { _id: string; doctorId?: string } = { _id: id };
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const patient = await Patient.findOneAndUpdate(
      query,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    ).populate('doctorId', 'name specialization hospital');

    if (!patient) {
      res.status(404).json({
        success: false,
        message: doctorId
          ? 'Patient not found under this doctor'
          : 'Patient not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/patients/:id
// DELETE /api/doctors/:doctorId/patients/:patientId
// Delete an existing patient.
export const deletePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = getRouteParam(req.params.doctorId);
    const id = getRouteParam(req.params.patientId || req.params.id);

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid patient ID',
      });
      return;
    }

    if (doctorId && !mongoose.isValidObjectId(doctorId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const query: { _id: string; doctorId?: string } = { _id: id };
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const patient = await Patient.findOneAndDelete(query);

    if (!patient) {
      res.status(404).json({
        success: false,
        message: doctorId
          ? 'Patient not found under this doctor'
          : 'Patient not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
