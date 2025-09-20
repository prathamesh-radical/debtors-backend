import express from 'express';
import { CreateLoaned, DeleteLoaned, GetLoanedData, GetSingleLoaned, UpdateLoaned } from '../controllers/LoanedController.js';
import { authenticateToken } from '../middlewares/VerifyToken.js';
const LoanedRoute = express.Router();

LoanedRoute.post('/add-loaned', CreateLoaned);
LoanedRoute.get('/get-loaned/:userId', authenticateToken, GetLoanedData)
LoanedRoute.get('/get-single-loaned/:loanedId', GetSingleLoaned)
LoanedRoute.patch('/update-loaned/:id', UpdateLoaned);
LoanedRoute.delete('/delete-loaned/:loanedId', DeleteLoaned);

export default LoanedRoute;
