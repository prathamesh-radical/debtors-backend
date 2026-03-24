import express from 'express';
import { FacebookLogin, GoogleLogin, UpdateSettings } from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.post("/facebook-login", FacebookLogin);
AuthRoute.put("/update-settings", UpdateSettings);

export default AuthRoute;