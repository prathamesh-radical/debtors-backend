import express from 'express';
import { EmailVerify, Login, Register, ResetPassword, ValidateToken, VerifyOTP } from '../controllers/AuthController.js';
import { AdminLogin, AdminRegister } from '../controllers/AdminController.js';

const AuthRoute = express.Router();

AuthRoute.post("/register", Register);
AuthRoute.post("/login", Login);
AuthRoute.post("/admin-register", AdminRegister);
AuthRoute.post("/admin-login", AdminLogin);
AuthRoute.post("/emailverify", EmailVerify);
AuthRoute.get("/validate", ValidateToken);
AuthRoute.post("/verifyotp", VerifyOTP);
AuthRoute.post("/resetpassword", ResetPassword);

export default AuthRoute;