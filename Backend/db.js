import mongoose from "mongoose";

const Dbconnector = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("Db Connection Stable!");
  } catch (error) {
    console.log("Db Connection No longer live", error);
  }
};

export default Dbconnector;

export default Dbconnector;