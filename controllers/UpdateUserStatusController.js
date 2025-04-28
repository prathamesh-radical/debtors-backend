import db from "../db/DbConnect.js";

const UpdateUserStatus = async (req, res) => {
    const userId = req.params.id;
    console.log(req.params);
    
    const { is_active } = req.body;
    console.log(req.body);
    

    try {
        await db.promise().query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, userId]);
        return res.status(200).json({ message: 'User status updated', success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update status', success: false });
    }
}

export { UpdateUserStatus };

