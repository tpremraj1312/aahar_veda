import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[${new Date().toISOString()}] Login failed: User not found for email: ${email}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[${new Date().toISOString()}] Login failed: Incorrect password for email: ${email}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log(`[${new Date().toISOString()}] Login successful for user: ${user._id}, token generated`);
    res.json({ token });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Login error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { email, name, password, calorieGoal, proteinGoal, carbsGoal, fatsGoal } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      console.log(`[${new Date().toISOString()}] Registration failed: Email already exists: ${email}`);
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      email,
      name,
      password: hashedPassword,
      calorieGoal: calorieGoal || 2000,
      proteinGoal: proteinGoal || 50,
      carbsGoal: carbsGoal || 200,
      fatsGoal: fatsGoal || 70,
    });

    await user.save();

    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log(`[${new Date().toISOString()}] Registration successful for user: ${user._id}, token generated`);
    res.json({ token });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Registration error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;