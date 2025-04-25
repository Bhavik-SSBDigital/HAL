import express from "express";
import { get_users } from "../controller/user-controller.js";

const router = express.Router();

router.get("/getUsers", get_users);

export default router;
