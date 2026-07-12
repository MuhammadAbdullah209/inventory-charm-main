import express from "express";
import { PORT } from "./config.js";
import Dbconnector from "./db.js";
import cors from "cors";
import dns from "dns";
import mongoose from "mongoose";
import productRoutes from "./Routes/productRoutes.js";
import userRoutes from "./Routes/userRoutes.js";
import billroute from "./Routes/BillingRoute.js";
import SupplierRoutes from "./Routes/Supplier_Routes.js";
import PurchaseRoutes from "./Routes/Purchase_Routes.js";
import DashboardRoutes from "./Routes/Dashboard_Routes.js";

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Handle OPTIONS preflight manually before anything else
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
});

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://inventory-charm-main.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

// Wait for DB before any request
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState === 1) {
        return next();
    }
    try {
        await Dbconnector();
        next();
    } catch (err) {
        res.status(503).json({ message: "Database unavailable, please retry" });
    }
});

app.get("/", (req, res) => {
    res.send(`
        <html>
            <body style="background:#111;color:white;font-family:Arial;text-align:center;padding-top:100px;">
                <h1 style="color:lime;">API is Running</h1>
                <p>MongoDB URL Exists: ${!!process.env.MONGODB_URL}</p>
                <p>NODE_ENV: ${process.env.NODE_ENV}</p>
            </body>
        </html>
    `);
});

app.use('/Api', productRoutes);
app.use('/Api', userRoutes);
app.use("/Api", billroute);
app.use("/Api/suppliers", SupplierRoutes);
app.use("/Api/purchases", PurchaseRoutes);
app.use("/Api/dashboard", DashboardRoutes);

async function startServer() {
    await Dbconnector();
    if (process.env.NODE_ENV !== "production") {
        app.listen(PORT, () => console.log(`Server running on ${PORT}`));
    }
}

startServer().catch(err => console.error("Startup error:", err));

export default app;