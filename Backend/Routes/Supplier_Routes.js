import express from "express";

import {
createSupplier,
getSuppliers,
updateSupplier,
deleteSupplier
}
from "../controllers/Supplier_Controller.js";
import { isAdmin, protect } from "../Middleware/middleware.js";

const router = express.Router();

router.post("/",protect,isAdmin,createSupplier);

router.get("/",protect,isAdmin,getSuppliers);

router.put("/:id",protect,isAdmin,updateSupplier);

router.delete("/:id",protect,isAdmin,deleteSupplier);

export default router;
//localhost:5000/Api/supplier