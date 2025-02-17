import express from "express";
import authRoutes from "./auth-routes.js";
import departmentRoutes from "./department-routes.js";
import fileRoutes from "./file-routes.js";
import fileDetailsRoutes from "./file-details-routes.js";
import projectRoutes from "./project-routes.js";
import roleRoutes from "./role-routes.js";
import userRoutes from "./user-routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/departments", departmentRoutes);
router.use("/files", fileRoutes);
router.use("/file-details", fileDetailsRoutes);
router.use("/projects", projectRoutes);
router.use("/roles", roleRoutes);
router.use("/users", userRoutes);

export default router;
