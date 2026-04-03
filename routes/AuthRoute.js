import express from 'express';
import {
    DeleteAccount, GoogleLogin, Login, Registration, SetPassword, UpdateProfile, UpdateSettings
} from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/register", Registration);
AuthRoute.post("/login", Login);
AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.post("/set-password", SetPassword);
AuthRoute.put("/update-settings", UpdateSettings);
AuthRoute.put("/update-profile", UpdateProfile);
AuthRoute.put("/update-password", SetPassword);
AuthRoute.delete("/delete-account", DeleteAccount);

export default AuthRoute;