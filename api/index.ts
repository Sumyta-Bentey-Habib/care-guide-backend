import 'dotenv/config';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';

import app from '../src/app.js';
import connectDB from '../src/config/db.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  app(req, res);
}

