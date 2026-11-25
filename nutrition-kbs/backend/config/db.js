import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
    );
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1); // stop the app: it cannot work without a database
  }
};

export default connectDB;
