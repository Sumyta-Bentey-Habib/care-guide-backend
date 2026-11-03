import { z } from 'zod';

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, 'Doctor name must be at least 2 characters'),

  specialization: z.string().trim().min(2, 'Specialization is required'),

  hospital: z.string().trim().min(2, 'Hospital name is required'),

  phone: z.string().trim().min(7, 'Please provide a valid phone number'),

  email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
});

export const updateDoctorSchema = createDoctorSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
