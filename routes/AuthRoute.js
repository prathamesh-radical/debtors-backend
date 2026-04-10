import express from 'express';
import {
    DeleteAccount, GoogleLogin, Login, Registration, SetPassword, UpdateProfile, UpdateSettings,
    VerifyPassword
} from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/register", Registration);
AuthRoute.post("/login", Login);
AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.post("/set-password", SetPassword);
AuthRoute.put("/update-settings", UpdateSettings);
AuthRoute.put("/update-profile", UpdateProfile);
AuthRoute.put("/update-password", SetPassword);
AuthRoute.post("/verify-password", VerifyPassword);
AuthRoute.delete("/delete-account", DeleteAccount);

export default AuthRoute;