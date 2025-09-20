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


const UpdateReport = async (req, res) => {
    try {
        const { updates } = req.body;
        if (!updates || updates.length === 0) {
            return res.status(400).json({ message: "No updates provided", success: false });
        }

        for (const update of updates) {
            const { id, amount, type } = update;

            if (type === "loaned") {
                await db.promise().query("UPDATE loaned SET amount = ? WHERE id = ?", [amount, id]);
            } else if (type === "owed") {
                await db.promise().query("UPDATE owed SET amount = ? WHERE id = ?", [amount, id]);
            }
        }

        res.status(200).json({ message: "Updates successful", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong", error, success: false });
    }
};
export { UpdateUserStatus, UpdateReport };

