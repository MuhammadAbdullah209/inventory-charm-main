import mongoose from "mongoose";

const Dbconnector = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Db Connection Stable!");
  } catch (error) {
    console.log("Db Connection No longer live", error);
  }
};

export default Dbconnector;