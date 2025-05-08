import express from 'express';
import Meal from '../models/meal.js';
import authenticate from '../middleware/authMiddleware.js';

const router = express.Router();

// Get meal history for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('[/api/history] - User ID:', req.user?.id); // Log the user ID

    const meals = await Meal.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    console.log('[/api/history] - Meals before sending:', meals); // Log the meals array

    res.json(meals);
    console.log('[/api/history] - Response sent'); // Log after sending
  } catch (error) {
    console.error('Error fetching meal history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;