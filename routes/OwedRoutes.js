import express from 'express';
import { CreateOwed, DeleteOwed, GetOwedData, GetSingleOwed, UpdateOwed } from '../controllers/OwedController.js';
import { authenticateToken } from '../middlewares/VerifyToken.js';

const OwedRoute = express.Router();

OwedRoute.post('/add-owed', CreateOwed);
OwedRoute.get('/get-owed/:userId', authenticateToken, GetOwedData)
OwedRoute.get('/get-single-owed/:owedId', GetSingleOwed)
OwedRoute.patch('/update-owed/:id', UpdateOwed);
OwedRoute.delete('/delete-owed/:owedId', DeleteOwed);

export default OwedRoute;
