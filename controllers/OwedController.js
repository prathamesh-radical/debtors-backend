import db from "../db/DbConnect.js";

const CreateOwed = async (req, res) => {
    const { user_id, amount, creditor_name, mobile_number, from_date, due_date, payment_option, note, type_of_debt, contact_id } = req.body;

    if(!user_id) {
        return res.status(400).json({ message: 'User ID is required', success: false });
    }
    
    try {
        const sql = `
            INSERT INTO owed (
            user_id, amount, creditor_name, mobile_number, from_date, due_date,
            payment_option, note, type_of_debt, contact_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [user_id, amount, creditor_name, mobile_number, from_date, due_date, payment_option, note || null, type_of_debt, contact_id],
            (err, results) => {
                if (err) {
                    console.error("Error inserting user:", err.message);
                    return res.status(500).json({ message: "Database error", success: false });
                }

                const updateSql = `UPDATE users SET entries = entries + 1 WHERE id = ?`;
                db.query(updateSql, [user_id], (updateErr) => {
                    if (updateErr) {
                        console.error("Error updating entries count:", updateErr.message);
                        return res.status(500).json({ message: "Error updating entries count", success: false });
                    }

                    return res.status(201).json({ message: "Owed added successfully and entries updated", success: true });
                });

            }
        );
    } catch (error) {
        console.error('Error inserting owed record:', error);
        res.status(500).json({ message: 'Internal server error', success: false });
    }
};


const GetOwedData = async (req, res) => {
    const { userId } = req.params;

    console.log("my id owed: ", typeof userId, typeof req.userId);


    if (userId != req.userId) {
        return res.status(403).json({ message: 'Unauthorized: User ID mismatch' });
    }

    try {
        db.query('SELECT * FROM owed WHERE user_id = ?', [userId], async (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error fetching owed data", success: false });
            }

            res.status(200).json({ message: "Owed data fetched successfully", success: true, owedData: result });
        });
    } catch (error) {
        console.error('Error fetching owed data:', error);
        res.status(500).json({ message: 'Server error', error: error.message, success: false });
    }
};

const GetSingleOwed = (req, res) => {
    const { owedId } = req.params;

    const query = 'SELECT * FROM owed WHERE id = ?';

    db.query(query, [owedId], (err, results) => {
        if (err) {
            console.error('Error fetching owed item:', err);
            return res.status(500).json({ message: 'Database error', success });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Owed item not found', success: false });
        }

        return res.json({ owedData: results[0], success: true });
    });
}

const UpdateOwed = async (req, res) => {
    const { id } = req.params;
    const { user_id, ...updateFields } = req.body;


    if (!id || !user_id || Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'Owe ID, user ID, and at least one field to update are required' });
    }

    try {
        const [existingOwe] = await db.promise().query('SELECT * FROM owed WHERE id = ? AND user_id = ?', [id, user_id]);
        if (!existingOwe) {
            return res.status(404).json({ message: 'Owe not found or unauthorized' });
        }

        const fields = Object.keys(updateFields);
        const values = Object.values(updateFields);
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        values.push(id, user_id);

        const query = `UPDATE owed SET ${setClause} WHERE id = ? AND user_id = ?`;
        await db.promise().query(query, values);

        const [updatedOwe] = await db.promise().query('SELECT * FROM owed WHERE id = ?', [id]);
        res.status(200).json(updatedOwe);
    } catch (error) {
        console.error('Error updating owe:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

const DeleteOwed = async (req, res) => {
    const { owedId } = req.params;
    try {
        await db.execute('DELETE FROM owed WHERE id = ?', [owedId]);
        res.json({ message: 'Owed deleted successfully', success: true });
    } catch (error) {
        console.error('deleteOwed Error:', error);
        res.status(500).json({ message: 'Server Error', success: false });
    }
}

export { CreateOwed, GetOwedData, GetSingleOwed, UpdateOwed, DeleteOwed };