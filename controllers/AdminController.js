import db from "../db/DbConnect.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const AdminRegister = async (req, res) => {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query("INSERT INTO admins (admin_id, password) VALUES (?, ?)", [adminId, hashedPassword], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error inserting values", success: false });
            }
            res.status(200).json({ message: "Admin Created", success: true });
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
}

const AdminLogin = async (req, res) => {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }
    try {
        db.query("SELECT * FROM admins WHERE admin_id = ?", [adminId], async (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            if (result.length > 0) {
                const isPasswordValid = await bcrypt.compare(password, result[0].password);
                if (isPasswordValid) {
                    const token = jwt.sign(
                        { id: result[0].id, adminId: result[0].admin_id },
                        process.env.JWT_SECRET,
                        { expiresIn: "2h" }
                    )
                    res.status(200).json({ message: "Admin Login successful", success: true, adminToken: token });
                } else {
                    res.status(401).json({ message: "Invalid credentials", success: false });
                }
            } else {
                res.status(401).json({ message: "Invalid credentials", success: false });
            }
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

export { AdminRegister, AdminLogin }