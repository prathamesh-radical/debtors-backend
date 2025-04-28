import db from "../db/DbConnect.js";

const CreateLoaned = async (req, res) => {
    const { user_id, amount, creditor_name, mobile_number, from_date, due_date, payment_option, note, type_of_debt, contact_id
    } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required', success: false });
    }

    try {
        const sql = `
            INSERT INTO loaned (
                user_id, amount, creditor_name, mobile_number, from_date, due_date,
                payment_option, note, type_of_debt, contact_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [user_id, amount, creditor_name, mobile_number, from_date, due_date, payment_option, note || null, type_of_debt, contact_id],
            (err, results) => {
                if (err) {
                    console.error("Error inserting loaned:", err.message);
                    return res.status(500).json({ message: "Database error", success: false });
                }

                const updateSql = `UPDATE users SET entries = entries + 1 WHERE id = ?`;
                db.query(updateSql, [user_id], (updateErr) => {
                    if (updateErr) {
                        console.error("Error updating entries count:", updateErr.message);
                        return res.status(500).json({ message: "Error updating entries count", success: false });
                    }

                    return res.status(201).json({ message: "Loaned added successfully and entries updated", success: true });
                });
            }
        );
    } catch (error) {
        console.error('Error inserting loaned record:', error);
        res.status(500).json({ message: 'Internal server error', success: false });
    }
};

const GetLoanedData = async (req, res) => {
    const { userId } = req.params;

    console.log("my id loaned: ", typeof userId, typeof req.userId);


    if (userId != req.userId) {
        return res.status(403).json({ message: 'Unauthorized: User ID mismatch' });
    }

    try {
        db.query('SELECT * FROM loaned WHERE user_id = ?', [userId], async (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error fetching loaned data", success: false });
            }

            res.status(200).json({ message: "Loaned data fetched successfully", success: true, loanedData: result });
        });
    } catch (error) {
        console.error('Error fetching loaned data:', error);
        res.status(500).json({ message: 'Server error', error: error.message, success: false });
    }
};

const GetSingleLoaned = (req, res) => {
    const { loanedId } = req.params;

    const query = 'SELECT * FROM loaned WHERE id = ?';

    db.query(query, [loanedId], (err, results) => {
        if (err) {
            console.error('Error fetching loaned item:', err);
            return res.status(500).json({ message: 'Database error', success });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Loaned item not found', success: false });
        }

        return res.json({ loanedData: results[0], success: true });
    });
}

const UpdateLoaned = async (req, res) => {
    const { id } = req.params;
    const { user_id, ...updateFields } = req.body;

    console.log("my body loaned: ", req.body);


    if (!id || !user_id || Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'Loan ID, user ID, and at least one field to update are required' });
    }

    try {
        const [existingLoan] = await db.promise().query('SELECT * FROM loaned WHERE id = ? AND user_id = ?', [id, user_id]);
        if (!existingLoan) {
            return res.status(404).json({ message: 'Loan not found or unauthorized' });
        }

        const fields = Object.keys(updateFields);
        const values = Object.values(updateFields);
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        values.push(id, user_id);

        const query = `UPDATE loaned SET ${setClause} WHERE id = ? AND user_id = ?`;
        await db.promise().query(query, values);

        const [updatedLoan] = await db.promise().query('SELECT * FROM loaned WHERE id = ?', [id]);
        res.status(200).json(updatedLoan);
    } catch (error) {
        console.error('Error updating loan:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

const DeleteLoaned = async (req, res) => {
    const { loanedId } = req.params;
    try {
        await db.execute('DELETE FROM loaned WHERE id = ?', [loanedId]);
        res.json({ message: 'Loaned deleted successfully', success: true });
    } catch (error) {
        console.error('deleteLoaned Error:', error);
        res.status(500).json({ message: 'Server Error', success: false });
    }
}

export { CreateLoaned, GetLoanedData, GetSingleLoaned, UpdateLoaned, DeleteLoaned };