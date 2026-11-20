import express from 'express';
import {
    DeleteAccount, ForgotPassword, GoogleLogin, Login, RegisterGoogleUser, Registration, ResetPassword, SetPassword,
    UpdatePremiumStatus, UpdateProfile, UpdateSettings, VerifyPassword, VerifyPasswordResetCode
} from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/register", Registration);
AuthRoute.post("/login", Login);
AuthRoute.post("/forgot-password", ForgotPassword);
AuthRoute.post("/verify-reset-code", VerifyPasswordResetCode);
AuthRoute.post("/reset-password", ResetPassword);
AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.post("/google-register", RegisterGoogleUser);
AuthRoute.post("/set-password", SetPassword);
AuthRoute.put("/update-settings", UpdateSettings);
AuthRoute.put("/update-profile", UpdateProfile);
AuthRoute.put("/update-password", SetPassword);
AuthRoute.post("/verify-password", VerifyPassword);
AuthRoute.delete("/delete-account", DeleteAccount);
AuthRoute.put("/update-premium", UpdatePremiumStatus);

export default AuthRoute;