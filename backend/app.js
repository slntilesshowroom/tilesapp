const express = require('express');
const cookieParser = require('cookie-parser');
const errorMiddleware = require('./middlewares/error');
const connectDatabase = require('./config/database');

const app = express();

// configver
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'config/config.env' });
}

// CORS Configuration
const cors = require('cors');

// CORS Configuration - Allow all origins for now (can be restricted later)
// Uncomment and update the whitelist if you want to restrict specific domains
/*
const whitelist = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://tiles-ecommerce.vercel.app',
    'https://ecom-fe-xi.vercel.app',
    'https://ecom-fe-17kf.vercel.app',
    'https://tilesecommerse.vercel.app',
    'https://tilesecommerse-*.vercel.app' // Allow all preview deployments
];
*/

app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Make sure the DB handshake has finished before any route runs. Without this
// mongoose buffers the query and the failure mode on a bad connection is a
// silent 10s hang instead of an error.
app.use(async (req, res, next) => {
    try {
        await connectDatabase();
        next();
    } catch (err) {
        next(err);
    }
});

const user = require('./routes/userRoute');
const product = require('./routes/productRoute');
const order = require('./routes/orderRoute');
const payment = require('./routes/paymentRoute');
const coupon = require('./routes/couponRoute');
const category = require('./routes/categoryRoute');
const blog = require('./routes/blogRoute');
const enquiry = require('./routes/enquiryRoutes');
const razorpay = require('./routes/razorpayRoute');
const slider = require('./routes/sliderRoute');

app.use('/api/v1', user);
app.use('/api/v1', product);
app.use('/api/v1', order);
app.use('/api/v1', payment);
app.use('/api/v1', coupon);
app.use('/api/v1', category);
app.use('/api/v1', blog);
app.use('/api/v1/enquiries', enquiry);
app.use('/api/v1', razorpay);
app.use('/api/v1', slider);

// error middleware
app.use(errorMiddleware);

module.exports = app;