import express from 'express';
import { DeleteContact, UpdateReport, UpdateUserStatus } from '../controllers/UpdateUserStatusController.js';

const UpdateStatusRoute = express.Router();

UpdateStatusRoute.put('/users/:id/status', UpdateUserStatus);
UpdateStatusRoute.put('/update-report', UpdateReport);
UpdateStatusRoute.delete("/delete-contact", DeleteContact);

export default UpdateStatusRoute;