import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db/DbConnect.js";
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

const GoogleLogin = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ message: 'ID token is required', success: false });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_WEB_CLIENT_ID,
        });

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
                        };

                        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
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

                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
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

const FacebookLogin = async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ message: 'Access token is required', success: false });
    }

    try {
        const fbRes = await fetch(
            `https://graph.facebook.com/me?fields=id,first_name,last_name,email&access_token=${accessToken}`
        );
        const fbData = await fbRes.json();

        if (fbData.error) {
            console.log('Facebook API error:', fbData);
            return res.status(401).json({ message: 'Invalid Facebook token', success: false });
        }

        const { id: facebookId, first_name, last_name, email } = fbData;

        if (!email) {
            return res.status(400).json({
                message: 'Email permission not granted. Please allow email access.',
                success: false
            });
        }

        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            console.log("err", err);
            if (err) return res.status(500).json({ message: 'Database error', success: false });

            let user;

            if (results.length === 0) {
                db.query(
                    'INSERT INTO users (firstname, lastname, email, facebook_id, is_active) VALUES (?, ?, ?, ?, 1)',
                    [first_name, last_name || '', email, facebookId],
                    (insertErr, insertResult) => {
                        console.log("insertErr", insertErr);
                        if (insertErr) {
                            return res.status(500).json({ message: 'Failed to create user', success: false });
                        }

                        user = {
                            id: insertResult.insertId,
                            firstname: first_name,
                            lastname: last_name || '',
                            email,
                        };

                        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
                        return res.status(201).json({ message: 'Account created', success: true, token, user });
                    }
                );
            } else {
                user = results[0];

                if (user.is_active === 0) {
                    return res.status(403).json({ message: 'Account is inactive', success: false });
                }

                if (!user.facebook_id) {
                    db.query('UPDATE users SET facebook_id = ? WHERE id = ?', [facebookId, user.id], () => {});
                }

                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
                return res.status(200).json({ message: 'Login successful', success: true, token, user });
            }
        });
    } catch (error) {
        console.error('Facebook login error:', error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
};

const UpdateSettings = (req, res) => {
    const { userId, currency, country } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    if (!currency && !country) {
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

export { GoogleLogin, FacebookLogin, UpdateSettings };