import 'dotenv/config';

import mongoose from 'mongoose';
import { hash } from 'bcryptjs';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';

const seedAdmin = async (): Promise<void> => {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error('Admin password must be at least 12 characters long');
    }

    const email = ADMIN_EMAIL.trim().toLowerCase();

    await connectDB();

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log(`Admin already exists: ${email}`);
      return;
    }

    const hashedPassword = await hash(ADMIN_PASSWORD, 12);

    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      password: hashedPassword,
    });

    console.log(`Admin created successfully: ${email}`);
  } catch (error) {
    console.error('Admin seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
