import express from 'express';
import { GetAllContatcs, GetOwedLoanedByContactId, GetUsers } from '../controllers/GetDataController.js';

const GetDataRoute = express.Router();

GetDataRoute.get('/contact-data/:contact_id', GetOwedLoanedByContactId);
GetDataRoute.get('/contact-data-all', GetAllContatcs);
GetDataRoute.get('/users', GetUsers);

export default GetDataRoute;