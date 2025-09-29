import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import db from "../db/DbConnect.js";

dotenv.config();

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, userName) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP - Debtors App',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #448EEB, #2243F0); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Password Reset OTP</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #333;">Hello ${userName},</p>
                    <p style="font-size: 16px; color: #333;">You requested to reset your password. Please use the following OTP to proceed:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background: #2243F0; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 2px;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #666;">This OTP is valid for 5 minutes only.</p>
                    <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">This is an automated email from Debtors App</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

const Register = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)",
            [firstName, lastName, email, hashedPassword],
            (err, results) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({ message: "Email already exists", success: false });
                    }
                    return res.status(500).json({ message: "Database error", success: false });
                }

                return res.status(201).json({ message: "User registered successfully", success: true });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

const Login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error", success: false });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: "User not found", success: false });
            }

            const user = results[0];

            if (user.is_active === 0) {
                return res.status(403).json({ message: "Access Denied. Your account is inactive.", success: false });
            }

            const match = await bcrypt.compare(password, user.password);
            if (match) {
                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });
                return res.status(200).json({ message: "Login successful", success: true, token, user });
            } else {
                return res.status(401).json({ message: "Invalid credentials", success: false });
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server error", success: false });
    }
};

const EmailVerify = (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required", success: false });
    }

    try {
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).json({ message: "Database error", success: false });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: "User not found", success: false });
            }

            const user = results[0];

            if (user.is_active === 0) {
                return res.status(403).json({ message: "Access Denied. Your account is inactive.", success: false });
            }

            const otp = generateOTP();
            const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

            db.query(
                "UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?",
                [otp, otpExpiry, email],
                async (updateErr, updateResults) => {
                    if (updateErr) {
                        return res.status(500).json({ message: "Database error", success: false });
                    }

                    const emailSent = await sendOTPEmail(email, otp, `${user.firstname} ${user.lastname}`);

                    if (emailSent) {
                        return res.status(200).json({
                            message: "OTP sent successfully to your email",
                            success: true,
                            user: {
                                id: user.id,
                                email: user.email,
                                firstname: user.firstname,
                                lastname: user.lastname
                            }
                        });
                    } else {
                        return res.status(500).json({ message: "Failed to send OTP email", success: false });
                    }
                }
            );
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server error", success: false });
    }
};

const VerifyOTP = (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required", success: false });
    }

    try {
        db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).json({ message: "Database error", success: false });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: "User not found", success: false });
            }

            const user = results[0];

            if (user.otp !== otp) {
                return res.status(400).json({ message: "Invalid OTP", success: false });
            }

            if (new Date() > new Date(user.otp_expiry)) {
                return res.status(400).json({ message: "OTP has expired", success: false });
            }

            db.query(
                "UPDATE users SET otp = NULL, otp_expiry = NULL WHERE email = ?",
                [email],
                (updateErr) => {
                    if (updateErr) {
                        console.error("Error clearing OTP:", updateErr);
                    }
                }
            );

            return res.status(200).json({
                message: "OTP verified successfully",
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstname: user.firstname,
                    lastname: user.lastname
                }
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server error", success: false });
    }
};

const ResetPassword = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and new password are required", success: false });
    }

    try {
        db.query("SELECT password FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error", success: false });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "User not found", success: false });
            }

            const user = results[0];

            const isSamePassword = await bcrypt.compare(password, user.password);
            if (isSamePassword) {
                return res.status(400).json({ message: "New password cannot be the same as the previous password", success: false });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            db.query(
                "UPDATE users SET password = ? WHERE email = ?",
                [hashedPassword, email],
                (updateErr, updateResults) => {
                    if (updateErr) {
                        console.error("Error updating password:", updateErr);
                        return res.status(500).json({ message: "Database error", success: false });
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ message: "User not found", success: false });
                    }
                    return res.status(200).json({ message: "Password reset successfully", success: true });
                }
            );
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server error", success: false });
    }
};

const ValidateToken = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token provided", success: false });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        db.query("SELECT * FROM users WHERE id = ?", [decoded.id], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error", success: false });
            }
            if (results.length === 0) {
                return res.status(401).json({ message: "User not found", success: false });
            }
            const user = results[0];
            if (user.is_active === 0) {
                return res.status(403).json({ message: "Access Denied. Your account is inactive.", success: false });
            }
            return res.status(200).json({ message: "Token is valid", success: true, user });
        });
    } catch (error) {
        return res.status(401).json({ message: "Token expired or invalid", success: false });
    }
};

export { Register, Login, EmailVerify, VerifyOTP, ResetPassword, ValidateToken };