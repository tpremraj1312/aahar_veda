import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import mealRoutes from './routes/mealRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js'
import historyRoutes from './routes/historyRoutes.js'
import authMiddleware from './middleware/authMiddleware.js';
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded images

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meal',authMiddleware, mealRoutes);
app.use('/api/dashboard',authMiddleware, dashboardRoutes);
app.use('/api/history',authMiddleware, historyRoutes);
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));