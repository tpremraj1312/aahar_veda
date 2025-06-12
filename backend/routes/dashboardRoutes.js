import express from 'express';
import auth from '../middleware/authMiddleware.js';
import Meal from '../models/meal.js';
import User from '../models/user.js';

const router = express.Router();

// Utility to get the start of the week (Saturday) and map days
const getWeekRange = (currentDate) => {
  const date = new Date(currentDate);
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = day === 0 ? -1 : 6 - day; // Adjust to get to Friday as the last day
  const endOfWeek = new Date(date);
  endOfWeek.setDate(date.getDate() + diff);
  endOfWeek.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(endOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);
  return { startOfWeek, endOfWeek };
};

// @route   GET /api/dashboard/summary
// @desc    Get daily summary of consumed nutrients
// @access  Private
router.get('/summary', auth, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/summary for user: ${req.user.id}`);
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const meals = await Meal.find({
      userId: req.user.id,
      consumed: true,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const summary = meals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += meal.macronutrients?.protein || 0;
        acc.carbs += meal.macronutrients?.carbs || 0;
        acc.fats += meal.macronutrients?.fats || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    res.json(summary);
  } catch (err) {
    console.error(`Error in /summary: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/dashboard/goals
// @desc    Get user's nutrition goals
// @access  Private
router.get('/goals', auth, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/goals for user: ${req.user.id}`);
  try {
    const user = await User.findById(req.user.id).select('calorieGoal proteinGoal carbsGoal fatsGoal');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const goals = {
      calories: user.calorieGoal || 2000,
      protein: user.proteinGoal || 50,
      carbs: user.carbsGoal || 200,
      fats: user.fatsGoal || 70,
    };

    res.json(goals);
  } catch (err) {
    console.error(`Error in /goals: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/dashboard/trend
// @desc    Get weekly calorie trend (Sat to Fri)
// @access  Private
router.get('/trend', auth, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/trend for user: ${req.user.id}`);
  try {
    const { startOfWeek, endOfWeek } = getWeekRange(new Date());

    const meals = await Meal.find({
      userId: req.user.id,
      consumed: true,
      createdAt: { $gte: startOfWeek, $lte: endOfWeek },
    });

    const labels = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const calorieData = new Array(7).fill(0);

    meals.forEach(meal => {
      const mealDate = new Date(meal.createdAt);
      const dayDiff = Math.floor((mealDate - startOfWeek) / (1000 * 60 * 60 * 24));
      if (dayDiff >= 0 && dayDiff < 7) {
        calorieData[dayDiff] += meal.calories || 0;
      }
    });

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Calories Consumed',
          data: calorieData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
        },
      ],
    };

    res.json(chartData);
  } catch (err) {
    console.error(`Error in /trend: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/dashboard/suggestion
// @desc    Get a meal suggestion based on user data
// @access  Private
router.get('/suggestion', auth, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/suggestion for user: ${req.user.id}`);
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Simple logic: suggest a meal based on remaining calories
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const meals = await Meal.find({
      userId: req.user.id,
      consumed: true,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const calorieGoal = user.calorieGoal || 2000;
    const remainingCalories = calorieGoal - totalCalories;

    const suggestions = [
      { name: 'Grilled Chicken Salad', calories: 300 },
      { name: 'Veggie Stir-Fry', calories: 250 },
      { name: 'Greek Yogurt with Fruit', calories: 200 },
    ];

    const suggestion = suggestions.find(s => s.calories <= remainingCalories) || suggestions[0];

    res.json(suggestion);
  } catch (err) {
    console.error(`Error in /suggestion: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/dashboard/recent-meals
//que   Get recent meals for the user
// @access  Private
router.get('/recent-meals', auth, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/recent-meals for user: ${req.user.id}`);
  try {
    const meals = await Meal.find({ userId: req.user.id, consumed: true })
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedMeals = meals.map(meal => ({
      _id: meal._id,
      foodName: meal.foodName,
      calories: meal.calories,
      weight: meal.weight,
      macronutrients: meal.macronutrients,
      healthinessRating: meal.healthinessRating,
      healthierAlternative: meal.healthierAlternative,
      imageUrl: meal.imageUrl,
      createdAt: meal.createdAt,
    }));

    res.json(formattedMeals);
  } catch (err) {
    console.error(`Error in /recent-meals: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;