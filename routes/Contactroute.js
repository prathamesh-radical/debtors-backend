import express from 'express';
import DeleteContact from '../controllers/DeleteController';

const ContactRoute = express.Router();

ContactRoute.delete("/delete-contact", DeleteContact);

export default ContactRoute;