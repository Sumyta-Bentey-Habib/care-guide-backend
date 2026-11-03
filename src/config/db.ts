import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const { DB_URL, DB_USER, DB_PASS } = process.env;

    if (!DB_URL || !DB_USER || !DB_PASS) {
      throw new Error("Missing MongoDB environment variables");
    }

    const dbUrl = DB_URL.replace(
      "mongodb+srv://",
      `mongodb+srv://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASS)}@`
    );

    await mongoose.connect(dbUrl);

    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
