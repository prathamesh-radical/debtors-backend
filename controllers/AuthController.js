import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import db from "../db/DbConnect.js";
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

const Registration = async (req, res) => {
    const { firstname, lastname, email, password, confirmPassword } = req.body;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address.", success: false });
    }

    if (!firstname || !lastname || !email || !password || !confirmPassword) {
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
                    "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)",
                    [firstname, lastname, email, hashedPassword],
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

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

            const userData = {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                profile_url: user.profile_url,
                created_at: user.created_at,
            };

            return res.status(200).json({ message: "Login successful", success: true, token, user: userData });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

const GoogleLogin = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ message: 'ID token is required', success: false });
    }

    try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_WEB_CLIENT_ID });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', success: false });

            if (results.length === 0) {
                db.query(
                    'INSERT INTO users (firstname, lastname, email, profile_url, google_id) VALUES (?, ?, ?, ?, ?)',
                    [firstName, lastName, email, picture, googleId],
                    (insertErr, insertResult) => {
                        if (insertErr) {
                            return res.status(500).json({ message: 'Failed to create user', success: false });
                        }

                        const user = {
                            id: insertResult.insertId,
                            firstname: firstName,
                            lastname: lastName,
                            profile_url: picture,
                            email,
                            created_at: user.created_at,
                        };

                        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
                        return res.status(201).json({ message: 'Account created', success: true, token, user });
                    }
                );
            } else {
                const user = results[0];

                if (!user.profile_url) {
                    db.query(
                        'UPDATE users SET profile_url = ?, google_id = ? WHERE id = ?',
                        [picture, googleId, user.id]
                    );
                }

                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
                return res.status(200).json({
                    message: 'Login successful',
                    success: true,
                    token,
                    user: { ...user, profile_url: picture }
                });
            }
        });

    } catch (error) {
        return res.status(401).json({ message: 'Invalid Google token', success: false });
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
            db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId],
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
    console.log("UpdateProfile called with:", { userId, firstName, lastName, email });

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
                    console.log("Database error:", err);
                    return res.status(500).json({ message: "Database error", success: false });
                }
                if (results.affectedRows === 0) {
                    return res.status(404).json({ message: "User not found", success: false });
                }
                return res.status(200).json({ message: "Profile updated successfully", success: true });
            }
        );
    } catch (error) {
        console.log("Internal server error:", error);
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

    db.query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
        values,
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error", success: false });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "User not found", success: false });
            }
            return res.status(200).json({ message: "Settings updated successfully", success: true });
        }
    );
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
                            message: "Account and related data deleted successfully",
                            success: true
                        });
                    });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", success: false });
    };
};

export { Registration, Login, GoogleLogin, SetPassword, UpdateProfile, UpdateSettings, DeleteAccount };