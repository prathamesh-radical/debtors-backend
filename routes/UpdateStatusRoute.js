import express from 'express';
import { UpdateReport, UpdateUserStatus } from '../controllers/UpdateUserStatusController.js';
import DeleteContact from '../controllers/DeleteController.js';

const UpdateStatusRoute = express.Router();

UpdateStatusRoute.put('/users/:id/status', UpdateUserStatus);
UpdateStatusRoute.put('/update-report', UpdateReport);
UpdateStatusRoute.delete("/delete-contact", DeleteContact);

export default UpdateStatusRoute;