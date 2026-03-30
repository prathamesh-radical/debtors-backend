import express from 'express';
import {
    FacebookLogin, GoogleLogin, Login, Registration, SetPassword, UpdateSettings
} from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/register", Registration);
AuthRoute.post("/login", Login);
AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.post("/facebook-login", FacebookLogin);
AuthRoute.put("/update-settings", UpdateSettings);
AuthRoute.post("/set-password", SetPassword);
AuthRoute.put("/update-password", SetPassword);

export default AuthRoute;