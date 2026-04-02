import express from 'express';
import DeleteContact from '../controllers/Contactcontroller.js';

const ContactRoute = express.Router();

ContactRoute.delete("/delete-contact", DeleteContact);

export default ContactRoute;