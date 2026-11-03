import type { Request, Response, NextFunction } from 'express';

import Doctor from '../models/doctor.model.js';
import Patient from '../models/patient.model.js';

// GET /api/dashboard/stats
export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch independent dashboard statistics in parallel.
    const [
      totalDoctors,
      totalPatients,
      patientsPerDoctor,
      patientRegistrationTrends,
      recentPatients,
    ] = await Promise.all([
      // Total number of doctors.
      Doctor.countDocuments(),

      // Total number of patients.
      Patient.countDocuments(),

      // Number of patients assigned to each doctor.
      Patient.aggregate([
        {
          $group: {
            _id: '$doctorId',
            totalPatients: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: Doctor.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'doctor',
          },
        },
        {
          $unwind: '$doctor',
        },
        {
          $project: {
            _id: 0,
            doctorId: '$doctor._id',
            doctorName: '$doctor.name',
            specialization: '$doctor.specialization',
            hospital: '$doctor.hospital',
            totalPatients: 1,
          },
        },
        {
          $sort: {
            totalPatients: -1,
          },
        },
      ]),

      // Patient registrations grouped by date.
      Patient.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Dhaka',
              },
            },
            totalPatients: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      // Latest five registered patients.
      Patient.find()
        .populate('doctorId', 'name specialization')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalDoctors,
          totalPatients,
        },
        patientsPerDoctor,
        patientRegistrationTrends,
        recentPatients,
      },
    });
  } catch (error) {
    next(error);
  }
};
