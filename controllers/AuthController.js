import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import db from "../db/DbConnect.js";
import { OAuth2Client } from 'google-auth-library';
import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
let passwordResetTablePromise;

const ensurePasswordResetTable = async () => {
    if (!passwordResetTablePromise) {
        passwordResetTablePromise = db.promise().query(`
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                email VARCHAR(255) NOT NULL PRIMARY KEY,
                code_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                verified_at DATETIME NULL,
                attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `).catch((error) => {
            console.log("error", error);
            passwordResetTablePromise = null;
            throw error;
        });
    }

    await passwordResetTablePromise;
};

const normalizeEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";

const Registration = async (req, res) => {
    const { firstname, lastname, email, password, confirmPassword, currency, country } = req.body;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address.", success: false });
    }

    if (!firstname || !lastname || !email || !password || !confirmPassword || !currency || !country) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match", success: false });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error checking user existence", success: false });
            }

            if (result.length > 0) {
                return res.status(400).json({ message: "User already exists with this email", success: false });
            } else {
                db.query(
                    "INSERT INTO users (firstname, lastname, email, password, currency, country) VALUES (?, ?, ?, ?, ?, ?)",
                    [firstname, lastname, email, hashedPassword, currency, country],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while registering you", success: false });
                        }
                        return res.status(200).json({ message: "User Registered Successfully", success: true });
                    }
                );
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

const Login = async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ message: "Request body is required", success: false });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required", success: false });
    }

    try {
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error", success: false });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: "Invalid email or password", success: false });
            }

            const user = results[0];

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: "Invalid email or password", success: false });
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '3650d' });

            const userData = {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                profile_url: user.profile_url,
                created_at: user.created_at,
                is_premium: user.is_premium
            };

            return res.status(200).json({ message: "Login successful", success: true, token, user: userData });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

const GoogleLogin = async (req, res) => {
    const { idToken } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_WEB_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', success: false });

            const user = results[0];

            if (results.length > 0) {
                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '3650d' });
                return res.status(200).json({
                    message: 'Login successful',
                    success: true,
                    isNewUser: false,
                    token,
                    user
                });
            } else {
                const [firstName, ...lastNameParts] = name.split(' ');
                return res.status(200).json({
                    message: 'Google verified, password required',
                    success: true,
                    isNewUser: true,
                    userData: {
                        firstname: firstName,
                        lastname: lastNameParts.join(' '),
                        email,
                        profile_url: picture,
                        google_id: googleId,
                        is_premium: false
                    }
                });
            }
        });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid Google token', success: false });
    }
};

const RegisterGoogleUser = async (req, res) => {
    const { firstname, lastname, email, password, profile_url, google_id, currency, country } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            'INSERT INTO users (firstname, lastname, email, password, profile_url, google_id, currency, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [firstname, lastname, email, hashedPassword, profile_url, google_id, currency || 'USD', country || ''],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to create user', success: false });
                }

                const userId = result.insertId;
                const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '3650d' });

                return res.status(201).json({
                    message: 'Account created successfully',
                    success: true,
                    token,
                    user: {
                        id: userId,
                        firstname,
                        lastname,
                        email,
                        profile_url,
                        currency: currency || 'USD',
                        country: country || ''
                    }
                });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
};

const SetPassword = (req, res) => {
    const { userId, password } = req.body;

    if (!password) {
        return res.status(400).json({ message: "Password is required", success: false });
    }

    db.query("SELECT password FROM users WHERE id = ?", [userId], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error", success: false });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query("UPDATE users SET password = ?, WHERE id = ?", [hashedPassword, userId],
                (updateErr, updateResults) => {
                    if (updateErr) {
                        return res.status(500).json({ message: "Database error", success: false });
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ message: "User not found", success: false });
                    }

                    return res.status(200).json({ message: "Password updated successfully", success: true });
                }
            );
        } catch (error) {
            return res.status(500).json({ message: "Error processing password", success: false });
        }
    });
};

const UpdateProfile = (req, res) => {
    const { userId, firstName, lastName, email } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    if (!firstName && !lastName && !email) {
        return res.status(400).json({ message: "At least one field is required", success: false });
    }

    try {
        db.query(`UPDATE users SET firstname = ?, lastname = ?, email = ? WHERE id = ?`,
            [firstName, lastName, email, userId],
            (err, results) => {
                if (err) {
                    return res.status(500).json({ message: "Database error", success: false });
                }
                if (results.affectedRows === 0) {
                    return res.status(404).json({ message: "User not found", success: false });
                }
                return res.status(200).json({ message: "Profile updated successfully", success: true });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

const UpdateSettings = (req, res) => {
    const { userId, currency, country, phone } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    if (!currency && !country && !phone) {
        return res.status(400).json({ message: "At least one field is required", success: false });
    }

    const fields = [];
    const values = [];

    if (currency) {
        fields.push("currency = ?");
        values.push(currency);
    }
    if (country) {
        fields.push("country = ?");
        values.push(country);
    }
    if (phone) {
        fields.push("phone = ?");
        values.push(phone);
    }

    values.push(userId);

    db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values, (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error", success: false });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        return res.status(200).json({ message: "Settings updated successfully", success: true });
    });
};

const VerifyPassword = async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ message: "UserId and password are required", success: false });
    }

    try {
        db.query("SELECT password FROM users WHERE id = ?", [userId], async (err, results) => {
            if (err) return res.status(500).json({ message: "Database error", success: false });
            if (results.length === 0) return res.status(404).json({ message: "User not found", success: false });

            const user = results[0];

            if (!user.password) {
                return res.status(400).json({ message: "No password set for this account", success: false });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Incorrect password", success: false });
            }

            return res.status(200).json({ message: "Password verified", success: true });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

const ForgotPassword = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address.", success: false });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
        console.error("Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.");
        return res.status(503).json({ message: "We could not send a code right now. Please try again.", success: false });
    }

    try {
        await ensurePasswordResetTable();
        const [users] = await db.promise().query(
            "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
            [email]
        );

        if (users.length === 0) {
            return res.status(200).json({
                message: `If an account exists for ${email}, a verification code is on its way.`,
                success: true
            });
        }

        const code = String(randomInt(100000, 1000000));
        const codeHash = await bcrypt.hash(code, 10);
        await db.promise().query(
            `INSERT INTO password_reset_codes (email, code_hash, expires_at, verified_at, attempts)
             VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), NULL, 0)
             ON DUPLICATE KEY UPDATE
                code_hash = VALUES(code_hash),
                expires_at = VALUES(expires_at),
                verified_at = NULL,
                attempts = 0`,
            [email, codeHash]
        );

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: process.env.SMTP_SECURE === "true",
            auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
        });

        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || SMTP_USER,
                to: email,
                subject: "Your Debtors password reset code",
                text: `Your password reset verification code is ${code}. It expires in 10 minutes.`,
                html: `<p>Your password reset verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`
            });
        } catch (mailError) {
            console.log("mailError", mailError);
            await db.promise().query(
                "DELETE FROM password_reset_codes WHERE email = ? AND code_hash = ?",
                [email, codeHash]
            );
            throw mailError;
        }

        return res.status(200).json({
            message: `If an account exists for ${email}, a verification code is on its way.`,
            success: true
        });
    } catch (error) {
        console.log("Password reset request failed:", error);
        return res.status(500).json({ message: "We could not send a code right now. Please try again.", success: false });
    }
};

const VerifyPasswordResetCode = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const { code } = req.body || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(String(code || ""))) {
        return res.status(400).json({ message: "A valid email address and 6-digit code are required.", success: false });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured.");
        return res.status(500).json({ message: "Unable to verify the code right now.", success: false });
    }

    try {
        await ensurePasswordResetTable();
        const [records] = await db.promise().query(
            `SELECT code_hash FROM password_reset_codes
             WHERE email = ? AND expires_at > UTC_TIMESTAMP() AND attempts < 5`,
            [email]
        );

        if (records.length === 0 || !(await bcrypt.compare(String(code), records[0].code_hash))) {
            if (records.length > 0) {
                await db.promise().query(
                    "UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = ? AND attempts < 5",
                    [email]
                );
            }
            return res.status(400).json({ message: "The verification code is invalid or has expired.", success: false });
        }

        const [users] = await db.promise().query(
            "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
            [email]
        );
        if (users.length === 0) {
            return res.status(400).json({ message: "The verification code is invalid or has expired.", success: false });
        }

        await db.promise().query(
            "UPDATE password_reset_codes SET verified_at = UTC_TIMESTAMP() WHERE email = ?",
            [email]
        );
        const resetToken = jwt.sign(
            { id: users[0].id, email, purpose: "password-reset" },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        return res.status(200).json({ message: "Verification code accepted.", success: true, resetToken });
    } catch (error) {
        console.log("Password reset code verification failed:", error);
        return res.status(500).json({ message: "Unable to verify the code right now.", success: false });
    }
};

const ResetPassword = async (req, res) => {
    const { resetToken, password } = req.body || {};
    if (typeof resetToken !== "string" || typeof password !== "string" || !password) {
        return res.status(400).json({ message: "A reset token and new password are required.", success: false });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured.");
        return res.status(500).json({ message: "Unable to reset the password right now.", success: false });
    }

    let reset;
    try {
        reset = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: "The password reset session is invalid or has expired.", success: false });
    }

    if (reset.purpose !== "password-reset" || !reset.id || !reset.email) {
        return res.status(401).json({ message: "The password reset session is invalid or has expired.", success: false });
    }

    let connection;
    try {
        await ensurePasswordResetTable();
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [records] = await connection.query(
            `SELECT email FROM password_reset_codes
             WHERE email = ? AND verified_at IS NOT NULL AND expires_at > UTC_TIMESTAMP()
             FOR UPDATE`,
            [reset.email]
        );
        if (records.length === 0) {
            await connection.rollback();
            return res.status(401).json({ message: "The password reset session is invalid or has expired.", success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [updatedUser] = await connection.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, reset.id]
        );
        if (updatedUser.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "User not found.", success: false });
        }

        await connection.query("DELETE FROM password_reset_codes WHERE email = ?", [reset.email]);
        await connection.commit();
        return res.status(200).json({ message: "Password reset successfully.", success: true });
    } catch (error) {
        console.log("Password reset failed:", error);
        if (connection) {
            await connection.rollback();
        }
        console.log("Password reset failed:", error);
        return res.status(500).json({ message: "Unable to reset the password right now.", success: false });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const DeleteAccount = (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    try {
        db.query("SELECT id FROM users WHERE id = ?", [userId], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({ message: "Database error", success: false });
            }

            if (checkResults.length === 0) {
                return res.status(404).json({ message: "User not found", success: false });
            }

            db.query("DELETE FROM owed WHERE user_id = ?", [userId], (owedErr) => {
                if (owedErr) {
                    return res.status(500).json({ message: "Failed to delete owed data", success: false });
                }

                db.query("DELETE FROM loaned WHERE user_id = ?", [userId], (loanedErr) => {
                    if (loanedErr) {
                        return res.status(500).json({ message: "Failed to delete loaned data", success: false });
                    }

                    db.query("DELETE FROM users WHERE id = ?", [userId], (deleteErr, deleteResults) => {
                        if (deleteErr) {
                            return res.status(500).json({ message: "Failed to delete account", success: false });
                        }

                        return res.status(200).json({
                            message: "Account and related data deleted successfully", success: true
                        });
                    });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", success: false });
    };
};

const UpdatePremiumStatus = (req, res) => {
    const { userId, isPremium } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User id required" });
    }

    try {
        db.query("UPDATE users SET is_premium=? WHERE id=?", [isPremium ? 1 : 0, userId], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error" });
            }

            return res.status(200).json({ success: true, message: "Premium updated" });
        });
    } catch (error) {
        return res.status(200).json({ success: true, message: "Internal server error" });
    }
}

export {
    Registration, Login, GoogleLogin, RegisterGoogleUser, SetPassword, UpdateProfile, UpdateSettings, VerifyPassword,
    ForgotPassword, VerifyPasswordResetCode, ResetPassword, DeleteAccount, UpdatePremiumStatus
};