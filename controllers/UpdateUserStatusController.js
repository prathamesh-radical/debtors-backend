import db from "../db/DbConnect.js";

const UpdateUserStatus = async (req, res) => {
    const userId = req.params.id;
    
    const { is_active } = req.body;

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
        res.status(500).json({ message: "Something went wrong", error, success: false });
    }
};

const DeleteContact = async (req, res) => {
    const { contactId, userId } = req.body;

    if (!contactId || !userId) {
        return res.status(400).json({ message: "Contact ID and User ID are required", success: false });
    }

    try {
        let numericContactId = contactId;

        if (isNaN(contactId)) {
            const findNumericIdQuery = `
                SELECT DISTINCT contact_id FROM loaned 
                WHERE user_id = ? AND creditor_name = ?
                UNION
                SELECT DISTINCT contact_id FROM owed 
                WHERE user_id = ? AND creditor_name = ?
                LIMIT 1
            `;

            return new Promise((resolve) => {
                db.query(findNumericIdQuery, [userId, contactId, userId, contactId], (findErr, results) => {
                    if (findErr) {
                        return resolve(res.status(500).json({
                            message: "Database error while finding contact",
                            success: false
                        }));
                    }

                    if (!results || results.length === 0) {
                        return resolve(res.status(404).json({
                            message: `Contact "${contactId}" not found`,
                            success: false
                        }));
                    }

                    numericContactId = results[0].contact_id;
                    
                    performDeletion(numericContactId, userId, res, contactId);
                });
            });
        } else {
            performDeletion(numericContactId, userId, res, null);
        }

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

function performDeletion(numericContactId, userId, res, contactName = null) {
    const countQuery = `
        (SELECT COUNT(*) as count FROM loaned WHERE user_id = ? AND contact_id = ?)
        UNION ALL
        (SELECT COUNT(*) as count FROM owed WHERE user_id = ? AND contact_id = ?)
    `;

    db.query(countQuery, [userId, numericContactId, userId, numericContactId], (countErr, countResults) => {
        if (countErr) {
            return res.status(500).json({
                message: "Database error while verifying contact",
                success: false
            });
        }

        const loanedCount = countResults[0]?.count || 0;
        const owedCount = countResults[1]?.count || 0;
        const totalTransactions = loanedCount + owedCount;

        if (totalTransactions === 0) {
            console.warn("⚠️  No transactions found for numeric contact_id:", numericContactId);
            return res.status(404).json({
                message: `Contact has no transactions`,
                success: false
            });
        }

        const deleteLoanedQuery = `
            DELETE FROM loaned 
            WHERE user_id = ? AND contact_id = ?
        `;

        db.query(deleteLoanedQuery, [userId, numericContactId], (loanedErr, loanedResult) => {
            if (loanedErr) {
                console.error("❌ Error deleting loaned transactions:", loanedErr);
                return res.status(500).json({
                    message: "Failed to delete loaned transactions",
                    success: false
                });
            }

            const deletedLoanedCount = loanedResult.affectedRows || 0;

            const deleteOwedQuery = `
                DELETE FROM owed 
                WHERE user_id = ? AND contact_id = ?
            `;

            db.query(deleteOwedQuery, [userId, numericContactId], (owedErr, owedResult) => {
                if (owedErr) {
                    console.error("❌ Error deleting owed transactions:", owedErr);
                    return res.status(500).json({
                        message: "Failed to delete owed transactions",
                        success: false
                    });
                }

                const deletedOwedCount = owedResult.affectedRows || 0;

                const totalDeleted = deletedLoanedCount + deletedOwedCount;
                const updateEntriesQuery = `
                    UPDATE users 
                    SET entries = entries - ? 
                    WHERE id = ?
                `

                db.query(updateEntriesQuery, [totalDeleted, userId], (updateErr) => {
                    if (updateErr) {
                        console.error("❌ Error updating entries count:", updateErr);
                        return res.status(500).json({
                            message: "Transactions deleted but failed to update entries count",
                            success: false
                        });
                    }

                    return res.status(200).json({
                        message: `Contact and ${totalDeleted} related transactions deleted successfully`,
                        success: true,
                        data: {
                            contactId: numericContactId,
                            contactName: contactName || "Unknown",
                            loanedTransactionsDeleted: deletedLoanedCount,
                            owedTransactionsDeleted: deletedOwedCount,
                            totalTransactionsDeleted: totalDeleted
                        }
                    });
                });
            });
        });
    });
}

export { UpdateUserStatus, UpdateReport, DeleteContact };

