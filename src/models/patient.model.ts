import { model, Schema, Types } from 'mongoose';

export type PatientGender = 'Male' | 'Female' | 'Other';

export interface IPatient {
  name: string;
  age: number;
  gender: PatientGender;
  phone: string;
  condition: string;
  doctorId: Types.ObjectId;
}

const patientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },

    age: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age cannot be negative'],
      max: [130, 'Please provide a valid age'],
    },

    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female', 'Other'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    condition: {
      type: String,
      required: [true, 'Patient condition is required'],
      trim: true,
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Patient = model<IPatient>('Patient', patientSchema);

export default Patient;
