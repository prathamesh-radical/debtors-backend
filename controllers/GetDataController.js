import db from "../db/DbConnect.js";

const GetUsers = (req, res) => {
    try {
        db.query("SELECT * FROM users", (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching data', details: err, success: false });
            }
            res.status(200).json({ result: results, success: true });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching data', details: error, success: false });
    }
}

const GetOwedLoanedByContactId = (req, res) => {
    const { contact_id } = req.params;
    const { user_id } = req.query;

    console.log("myid: ", req.params);
    

    if (!contact_id || !user_id) {
        return res.status(400).json({ error: 'contact_id and user_id is required', success: false });
    }

    const combinedQuery = `
        SELECT 'owed' AS type, id, user_id, contact_id, amount, creditor_name, from_date, due_date, payment_option, type_of_debt 
        FROM owed 
        WHERE contact_id = ? AND user_id = ?
        UNION ALL
        SELECT 'loaned' AS type, id, user_id, contact_id, amount, creditor_name, from_date, due_date, payment_option, type_of_debt 
        FROM loaned 
        WHERE contact_id = ? AND user_id = ?
    `;

    db.query(combinedQuery, [contact_id, user_id, contact_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching data', details: err, success: false });
        }
        res.status(200).json({ result: results, success: true });
    });
}

const GetAllContatcs = (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required', success: false });
    }

    const combinedQuery = `
        SELECT 'owed' AS type, id, user_id, contact_id, amount, creditor_name, from_date, due_date, payment_option, type_of_debt 
        FROM owed 
        WHERE user_id = ?
        UNION ALL
        SELECT 'loaned' AS type, id, user_id, contact_id, amount, creditor_name, from_date, due_date, payment_option, type_of_debt 
        FROM loaned 
        WHERE user_id = ?
    `;

    db.query(combinedQuery, [user_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching data', details: err, success: false });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No contacts found', success: false });
        }

        const contactData = results.map(row => (
            {
                ...row,
                unique_id: `${row.type}-${row.id}`,
            }
        ));

        res.status(200).json({ result: contactData, success: true });
    });
}

export { GetUsers, GetOwedLoanedByContactId, GetAllContatcs };

