import express from 'express';
import { GoogleLogin, UpdateSettings } from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.put("/update-settings", UpdateSettings);

export default AuthRoute;