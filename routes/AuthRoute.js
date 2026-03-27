import express from 'express';
import { CheckPhoneVerification, FacebookLogin, GoogleLogin, RequestPhoneVerification, SmsInboundWebhook, UpdateSettings, VerifyOtp } from '../controllers/AuthController.js';

const AuthRoute = express.Router();

AuthRoute.post("/google-login", GoogleLogin);
AuthRoute.post("/facebook-login", FacebookLogin);
AuthRoute.put("/update-settings", UpdateSettings);
AuthRoute.post("/request-phone-verification", RequestPhoneVerification);
AuthRoute.get("/check-phone-verification", CheckPhoneVerification);
AuthRoute.post("/sms-inbound", SmsInboundWebhook);
AuthRoute.post("/verify-otp", VerifyOtp);

export default AuthRoute;