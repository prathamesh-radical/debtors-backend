import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db/DbConnect.js";

dotenv.config();

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
                    console.error("Error inserting user:", err.message);
                    return res.status(500).json({ message: "Database error", success: false });
                }

                return res.status(201).json({ message: "User registered successfully", success: true });
            }
        );
    } catch (error) {
        console.error("Error registering user:", error.message);
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

            const match = await bcrypt.compare(password, user.password);
            if (match) {
                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

                console.log("New user login: ", user);
                
                return res.status(200).json({ message: "Login successful", success: true, token, user });
            } else {
                return res.status(401).json({ message: "Invalid credentials", success: false });
            }
        });
    } catch (error) {
        console.error("Error logging in user:", error.message);
        return res.status(500).json({ message: "Internal Server error", success: false });
    }
};

const EmailVerify = (req, res) => {
    const { email } = req.body;
    console.log("email", email);

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

            return res.status(200).json({ message: "Otp send successfully", success: true, user });
        });
    } catch (error) {
        console.error("Error logging in user:", error.message);
        return res.status(500).json({ message: "Internal Server error", success: false });
    }
}

export { Register, Login, EmailVerify };