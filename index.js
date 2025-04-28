import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import AuthRoute from './routes/AuthRoute.js';
import db from './db/DbConnect.js';
import OwedRoute from './routes/OwedRoutes.js';
import LoanedRoute from './routes/LoanedRoute.js';
import GetDataRoute from './routes/GetDataRoute.js';
import UpdateStatusRoute from './routes/UpdateStatusRoute.js';

dotenv.config();

db.query("SELECT 1", (err, results) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log("Connected to the MySQL database.");
    }
});

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", AuthRoute);
app.use('/api', OwedRoute);
app.use('/api', LoanedRoute);
app.use('/api', GetDataRoute);
app.use('/api', UpdateStatusRoute);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`App listening on port ${process.env.PORT || 3000}`);
});