import { Router } from "express";
import wegRoutes from "./wegRoutes";
import financeRoutes from "./financeRoutes";
import adminRoutes from "./adminRoutes";
import { noCacheAdmin } from "../middleware/noCacheAdmin";

const router = Router();

router.use(wegRoutes);
router.use(financeRoutes);
router.use("/api/admin", noCacheAdmin);
router.use(adminRoutes);

export default router;
