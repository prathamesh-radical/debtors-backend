import express from 'express';
import { UpdateReport, UpdateUserStatus } from '../controllers/UpdateUserStatusController.js';

const UpdateStatusRoute = express.Router();

UpdateStatusRoute.put('/users/:id/status', UpdateUserStatus);
UpdateStatusRoute.put('/update-report', UpdateReport);


export default UpdateStatusRoute;
