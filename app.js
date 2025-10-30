import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import customerRoutes from './routes/customer.routes.js';
import milkRoutes from './routes/milk.routes.js';
import billingRoutes from './routes/billing.routes.js';

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
    'https://milk-men-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:4200',
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", 
    credentials: true,                        
    optionsSuccessStatus: 204                 
};

app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/seller', sellerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/billing', billingRoutes);

// Health check
app.get('/', (req, res) => res.send('Milk Delivery API Running 🥛'));

export default app;