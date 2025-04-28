import express from 'express';
import { Login, Register } from '../controllers/AuthController.js';
import { AdminLogin, AdminRegister } from '../controllers/AdminController.js';

const AuthRoute = express.Router();

AuthRoute.post("/register", Register);
AuthRoute.post("/login", Login);
AuthRoute.post("/admin-register", AdminRegister);
AuthRoute.post("/admin-login", AdminLogin);

export default AuthRoute;