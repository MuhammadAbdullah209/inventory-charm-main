import express from "express";
import { PORT } from "./config.js";
import Dbconnector from "./db.js";
import cors from "cors";
import dns from "dns";
import productRoutes from "./Routes/productRoutes.js";
import userRoutes from "./Routes/userRoutes.js";
import billroute from "./Routes/BillingRoute.js";
import router from "./Routes/Supplier_Routes.js";
import PurchaseRoutes from "./Routes/Purchase_Routes.js";
import DashboardRoutes from "./Routes/Dashboard_Routes.js";
dns.setServers(["1.1.1.1", "8.8.8.8"])
const app = express();
app.use(cors());
app.use(express.json());
// Routes
app.get("/", (req, res) => {
    try {
        return res.status(200).json({ message: "Api is Working Successfully!" })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})
app.use('/Api', productRoutes);
app.use('/Api', userRoutes);
app.use("/Api", billroute);
app.use("/Api/suppliers", router);
app.use("/Api/purchases", PurchaseRoutes);
app.use("/Api/dashboard", DashboardRoutes);
app.listen(PORT, () => {
    Dbconnector();
    console.log(`Server is Running on ${PORT}`);
});
//http:localhost:5000/Api/