import express from "express";
import { sign_up, login, create_admin } from "../controller/auth-controller.js";

const router = express.Router();

router.post("/signup", sign_up);
router.post("/login", login);
router.post("/createAdmin", create_admin);

export default router;
