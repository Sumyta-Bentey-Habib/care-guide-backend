import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import Doctor, { type IDoctor } from '../models/doctor.model.js';
import Patient from '../models/patient.model.js';

// Escape special regex characters in search input.
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// MongoDB search filter type.
// This is separate from IDoctor because query values can be RegExp.
type DoctorFilter = {
  $or?: Array<Partial<Record<keyof IDoctor, RegExp>>>;
  specialization?: RegExp;
  hospital?: RegExp;
  createdAt?: {
    $gte?: Date;
    $lt?: Date;
  };
};

// GET /api/doctors
// Supports search, specialization, hospital, date-wise filtering, and pagination.
export const getDoctors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const specialization =
      typeof req.query.specialization === 'string' ? req.query.specialization.trim() : '';

    const hospital = typeof req.query.hospital === 'string' ? req.query.hospital.trim() : '';

    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '';

    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '';

    const requestedPage = Number(req.query.page);
    const requestedLimit = Number(req.query.limit);

    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 10;

    const filter: DoctorFilter = {};

    // Search across multiple doctor fields.
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');

      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { hospital: searchRegex },
        { specialization: searchRegex },
      ];
    }

    // Filter by specialization.
    if (specialization) {
      filter.specialization = new RegExp(`^${escapeRegex(specialization)}$`, 'i');
    }

    // Filter by hospital.
    if (hospital) {
      filter.hospital = new RegExp(escapeRegex(hospital), 'i');
    }

    // Filter by doctor creation date.
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

    const [doctors, totalDoctors] = await Promise.all([
      Doctor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      Doctor.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: doctors,
      pagination: {
        currentPage: page,
        limit,
        totalDoctors,
        totalPages: Math.ceil(totalDoctors / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/doctors/:id
// Get a single doctor by ID.
export const getDoctorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const doctor = await Doctor.findById(id).lean();

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/doctors
// Create a new doctor.
export const createDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctor = await Doctor.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/doctors/:id
// Update an existing doctor.
export const updateDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/doctors/:id
// Prevent deletion if the doctor has assigned patients.
export const deleteDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
      return;
    }

    const doctor = await Doctor.findById(id);

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    const assignedPatients = await Patient.countDocuments({
      doctorId: doctor._id,
    });

    if (assignedPatients > 0) {
      res.status(409).json({
        success: false,
        message: 'Cannot delete a doctor with assigned patients',
        assignedPatients,
      });
      return;
    }

    await doctor.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Doctor deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
