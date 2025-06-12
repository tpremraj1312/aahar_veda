import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import authMiddleware from '../middleware/authMiddleware.js';
import { estimateCalories } from '../services/gemini.js';
import Meal from '../models/meal.js';
// import { getAIAnalysis } from '../services/aiAnalysis.js';
const router = express.Router();

// Multer setup for file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: './Uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// @route   POST /api/meal/estimate
// @desc    Estimate calories for a meal
// @access  Private
router.post('/estimate', authMiddleware, upload.single('image'), async (req, res) => {
  const { foodName, weight } = req.body;
  const imagePath = req.file ? req.file.path : null;

  console.log(`[${new Date().toISOString()}] POST /api/meal/estimate: foodName=${foodName}, weight=${weight}, image=${imagePath}, userId=${req.user.id}`);

  if (!foodName) {
    return res.status(400).json({ error: 'Food name is required' });
  }

  try {
    const result = await estimateCalories(foodName, weight || null, imagePath);
    res.json({
      ...result,
      imageUrl: imagePath ? `/Uploads/${req.file.filename}` : null,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in /estimate: ${err.message}`, err.stack);
    res.status(400).json({ error: err.message });
  }
});

// @route   POST /api/meal/log
// @desc    Log a new meal
// @access  Private
router.post('/log', authMiddleware, async (req, res) => {
  const {
    foodName,
    weight,
    calories,
    macronutrients,
    healthinessRating,
    healthierAlternative,
    imageUrl,
    consumed,
  } = req.body;

  console.log(`[${new Date().toISOString()}] POST lk /api/meal/log:`, {
    userId: req.user.id,
    foodName,
    weight,
    calories,
    macronutrients,
    healthinessRating,
    healthierAlternative,
    imageUrl,
    consumed,
  });

  if (!foodName || !calories) {
    return res.status(400).json({ error: 'Food name and calories are required' });
  }

  try {
    const meal = new Meal({
      userId: req.user.id,
      foodName: foodName.trim(),
      weight: weight ? parseFloat(weight) : null,
      calories: parseFloat(calories),
      macronutrients: macronutrients || { protein: 0, carbs: 0, fats: 0 },
      healthinessRating: healthinessRating ? parseInt(healthinessRating) : null,
      healthierAlternative: healthierAlternative || null,
      imageUrl: imageUrl || null,
      consumed: consumed !== undefined ? consumed : true,
    });

    await meal.save();
    console.log(`[${new Date().toISOString()}] Meal saved:`, meal);
    res.status(201).json(meal);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in /log: ${err.message}`, err.stack);
    res.status(500).json({ error: `Failed to save meal: ${err.message}` });
  }
});

// @route   GET /api/meal
// @desc    Get user's meals
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const meals = await Meal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    console.log(`[${new Date().toISOString()}] Fetched meals for user ${req.user.id}:`, meals.length);
    res.json(meals);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in /meal GET: ${err.message}`, err.stack);
    res.status(500).json({ error: `Failed to fetch meals: ${err.message}` });
  }
});

// @route   DELETE /api/meal/:id
// @desc    Delete a meal
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    console.log(`[${new Date().toISOString()}] Meal deleted for user ${req.user.id}:`, meal);
    res.json({ message: 'Meal deleted successfully' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in /meal DELETE: ${err.message}`, err.stack);
    res.status(500).json({ error: `Failed to delete meal: ${err.message}` });
  }
});

// router.get('/ai-analysis', authMiddleware, getAIAnalysis);

export default router;