import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
    );
  } catch {
    console.error("MongoDB connection failed; verify MONGO_URI and database network access.");
    process.exit(1); // stop the app: it cannot work without a database
  }
};

export default connectDB;
