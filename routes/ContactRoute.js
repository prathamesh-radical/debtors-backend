import express from 'express';
import { DeleteContact } from '../controllers/ContactController';

const ContactsRoute = express.Router();

ContactsRoute.delete('/delete-contact', DeleteContact);

export default ContactsRoute;