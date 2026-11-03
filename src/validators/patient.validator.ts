import { z } from 'zod';

// Validate patient creation.
export const createPatientSchema = z.object({
  name: z.string().trim().min(2, 'Patient name must be at least 2 characters'),

  age: z
    .number()
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(130, 'Please provide a valid age'),

  gender: z.enum(['Male', 'Female', 'Other']),

  phone: z.string().trim().min(7, 'Please provide a valid phone number'),

  condition: z.string().trim().min(2, 'Patient condition must be at least 2 characters'),
});

// Validate partial patient updates.
export const updatePatientSchema = createPatientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
