import express from 'express';
import { UpdateUserStatus } from '../controllers/UpdateUserStatusController.js';

const UpdateStatusRoute = express.Router();

UpdateStatusRoute.put('/users/:id/status', UpdateUserStatus);

export default UpdateStatusRoute;
