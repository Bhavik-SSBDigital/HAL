import React, { useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./Login.module.css"; // Importing CSS module
import { toast } from "react-toastify";
import axios from "axios";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

const Login = () => {
    const [showPass, setShowPass] = useState(false); // State to toggle password visibility
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();
    const navigate = useNavigate();
    const onSubmit = async (data) => {
        // Handle login logic
        const url = backendUrl + "/login";
        try {
            const res = await axios.post(url, data);
            sessionStorage.setItem("email", res?.data["email"]);
            sessionStorage.setItem("username", res?.data["userName"]);
            sessionStorage.setItem(
                "isKeeperOfPhysicalDocs",
                res?.data["isKeeperOfPhysicalDocs"]
            );
            sessionStorage.setItem("initiator", res?.data["isInitiator"]);
            sessionStorage.setItem("accessToken", res?.data["accessToken"]);
            sessionStorage.setItem("refreshToken", res?.data["refreshToken"]);
            sessionStorage.setItem("specialUser", res?.data["specialUser"]);
            navigate('/')
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.message);
            console.log(error?.message);
        }
        console.log("Login data:", data);
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginBox}>
                <div className={styles.loginLogo}>
                    <h2>Document Management System</h2>
                </div>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className={styles.formGroup}>
                        <input
                            type="text"
                            placeholder="Username"
                            {...register("username", { required: true })}
                            className={`${styles.textfields} ${errors.username && styles.errorInput}`}
                        />
                        {errors.username && (
                            <p className={styles.errorMessage}>Username is required</p>
                        )}
                    </div>
                    <div className={styles.formGroup}>
                        <div className={styles.pass}>
                            <input
                                type={showPass ? "text" : "password"}
                                placeholder="Password"
                                {...register("password", { required: true })}
                                className={`${styles.textfields} ${errors.password && styles.errorInput}`}
                            />
                            <span
                                className={styles.eyeIcon}
                                onClick={() => setShowPass(!showPass)}
                            >
                                {showPass ? <IconEyeOff /> : <IconEye />}
                            </span>
                        </div>
                        {errors.password && (
                            <p className={styles.errorMessage}>Password is required</p>
                        )}
                    </div>
                    <button
                        disabled={isSubmitting}
                        type="submit"
                        className={styles.loginBtn}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : "Login"}
                    </button>
                </form>
                <div className={styles.extraLinks}>
                    <a href="#">Forgot Password?</a>
                </div>
            </div>
        </div>
    );
};

export default Login;
