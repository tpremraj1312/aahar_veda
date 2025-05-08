import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import authMiddleware from '../middleware/authMiddleware.js';
import { estimateCalories } from '../services/gemini.js';
import Meal from '../models/meal.js';

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

// Estimate calories
router.post('/estimate', authMiddleware, upload.single('image'), async (req, res) => {
  const { foodName, weight } = req.body;
  const imagePath = req.file ? req.file.path : null;

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
    console.error('Error in /estimate:', err.message, err.stack);
    res.status(400).json({ error: err.message });
  }
});

// Log meal
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

  console.log('Received /log request:', req.body);

  if (!foodName || !calories) {
    return res.status(400).json({ error: 'Food name and calories are required' });
  }

  try {
    const meal = new Meal({
      userId: req.user.userId,
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
    console.log('Meal saved:', meal);
    res.status(201).json(meal);
  } catch (err) {
    console.error('Error in /log:', err.message, err.stack);
    res.status(500).json({ error: `Failed to save meal: ${err.message}` });
  }
});

// Get user's meals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const meals = await Meal.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    console.log('Fetched meals:', meals);
    res.json(meals);
  } catch (err) {
    console.error('Error in /meal GET:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch meals: ' + err.message });
  }
});

// Delete meal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    console.log('Meal deleted:', meal);
    res.json({ message: 'Meal deleted successfully' });
  } catch (err) {
    console.error('Error in /meal DELETE:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete meal: ' + err.message });
  }
});

export default router;