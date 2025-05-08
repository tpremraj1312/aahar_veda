import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Check, Apple } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddMeal = () => {
  const [foodName, setFoodName] = useState('');
  const [weight, setWeight] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const API_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  // Handle drag-and-drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      toast.error('Please upload a valid image file');
    }
  };

  // Handle file input
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      toast.error('Please upload a valid image file');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foodName || !weight) {
      toast.error('Please enter food name and weight');
      return;
    }
    if (!token) {
      toast.error('Please log in to add a meal');
      navigate('/login');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('foodName', foodName);
    formData.append('weight', weight);
    if (image) formData.append('image', image);

    try {
      const res = await axios.post(`${API_URL}/meal/estimate`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data);
      setShowModal(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to estimate calories');
    } finally {
      setLoading(false);
    }
  };

  // Handle meal logging
  const handleLogMeal = async (consumed) => {
    if (!result) return;

    console.log('Sending to /meal/log:', { ...result, consumed });

    try {
      await axios.post(
        `${API_URL}/meal/log`,
        { ...result, consumed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Meal ${consumed ? 'logged' : 'discarded'} successfully`);
      setShowModal(false);
      setFoodName('');
      setWeight('');
      setImage(null);
      setImagePreview(null);
      setResult(null);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error logging meal:', err.response?.data, err.message);
      toast.error(err.response?.data?.error || 'Failed to log meal');
    }
  };

  // Random nutrition tip
  const nutritionTips = [
    'Stay hydrated by drinking at least 8 glasses of water daily!',
    'Incorporate colorful vegetables for a nutrient boost.',
    'Choose whole grains over refined grains for better health.',
  ];
  const randomTip = nutritionTips[Math.floor(Math.random() * nutritionTips.length)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-6"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <Apple className="w-8 h-8 text-blue-600 mr-2" /> Add a New Meal
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center hover:border-blue-600 transition-all"
          >
            {imagePreview ? (
              <div className="relative group">
                <motion.img
                  src={imagePreview}
                  alt="Food preview"
                  className="max-h-48 mx-auto rounded-lg shadow-md group-hover:scale-105 transition-transform"
                  whileHover={{ scale: 1.1 }}
                />
                <button
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                    fileInputRef.current.value = null;
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Drag & drop an image or click to upload</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 cursor-pointer"
                >
                  Upload Image
                </label>
              </div>
            )}
          </div>

          {/* Food Name and Weight */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-gray-700 font-semibold mb-1">Food Name</label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g., Apple"
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-gray-700 font-semibold mb-1">Weight (grams)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 150"
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                Estimating...
              </div>
            ) : (
              'Estimate Calories'
            )}
          </motion.button>
        </form>

        {/* Nutrition Tip */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center"
          >
            <Apple className="w-6 h-6 text-blue-600 mr-2" />
            <p className="text-gray-700">Quick Tip: {randomTip}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Confirmation Modal */}
      {showModal && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, rotateX: 20 }}
            animate={{ scale: 1, rotateX: 0 }}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Meal Analysis</h2>
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-lg mb-4">
              <p className="text-gray-700"><strong>Food:</strong> {result.foodName}</p>
              <p className="text-gray-700"><strong>Calories:</strong> {result.calories} kcal</p>
              <p className="text-gray-700"><strong>Protein:</strong> {result.macronutrients?.protein || 0}g</p>
              <p className="text-gray-700"><strong>Carbs:</strong> {result.macronutrients?.carbs || 0}g</p>
              <p className="text-gray-700"><strong>Fats:</strong> {result.macronutrients?.fats || 0}g</p>
              <p className="text-gray-700"><strong>Healthiness:</strong> {result.healthinessRating}/10</p>
              {result.healthierAlternative && (
                <p className="text-gray-700"><strong>Healthier Alternative:</strong> {result.healthierAlternative}</p>
              )}
              {result.imageUrl && (
                <img src={`${API_URL}${result.imageUrl}`} alt="Food" className="mt-2 max-h-32 rounded-lg" />
              )}
            </div>

            {/* Nutrient Bars */}
            <div className="space-y-2 mb-4">
              {['protein', 'carbs', 'fats'].map((nutrient, index) => (
                <div key={index}>
                  <p className="text-gray-600 capitalize">{nutrient}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <motion.div
                      className="bg-blue-600 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(result.macronutrients?.[nutrient] || 0) * 2}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLogMeal(true)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Check className="inline w-5 h-5 mr-1" /> Log Meal
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowModal(false);
                  setResult(null);
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
              >
                <X className="inline w-5 h-5 mr-1" /> Discard
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AddMeal;