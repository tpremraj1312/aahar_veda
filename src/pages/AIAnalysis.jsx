import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2, Apple } from 'lucide-react';

const AIAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('[AIAnalysis] Token present:', !!token);
        if (!token) {
          throw new Error('Please log in to view AI analysis');
        }

        console.log('[AIAnalysis] Fetching AI analysis');
        const response = await axios.get('http://localhost:5000/api/ai-analysis', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('[AIAnalysis] API Response:', response.data);

        // Check if response is an array (unexpected meal data)
        if (Array.isArray(response.data)) {
          console.warn('[AIAnalysis] Received meal array instead of analysis');
          setMeals(response.data);
          setAnalysis(null);
        } else {
          setAnalysis(response.data);
          setMeals([]);
        }
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to load AI analysis';
        console.error('[AIAnalysis] Error:', errorMessage, err);
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  if (loading) {
    console.log('[AIAnalysis] Rendering loading state');
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center h-64 min-h-screen"
      >
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </motion.div>
    );
  }

  if (error) {
    console.log('[AIAnalysis] Rendering error state:', error);
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 text-red-600 p-8 rounded-lg shadow-lg max-w-2xl mx-auto mt-8"
      >
        <p className="text-lg">{error}</p>
      </motion.div>
    );
  }

  console.log('[AIAnalysis] Rendering data:', { analysis, meals });
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto mt-8"
    >
      <h2 className="text-3xl font-bold text-gray-800 mb-6">AI Nutrition Analysis</h2>

      {meals.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-indigo-600 mb-4">Recent Meals</h3>
          <p className="text-yellow-600 mb-4">
            Note: AI analysis is unavailable; showing meal data instead.
          </p>
          <ul className="space-y-4">
            {meals.map((meal) => (
              <li key={meal._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Apple className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-gray-800">{meal.foodName}</p>
                  <p className="text-sm text-gray-600">
                    {meal.calories} kcal | Protein: {meal.macronutrients?.protein || 0}g | Carbs:{' '}
                    {meal.macronutrients?.carbs || 0}g | Fats: {meal.macronutrients?.fats || 0}g
                  </p>
                  <p className="text-sm text-gray-500">
                    Healthiness: {meal.healthinessRating || 'N/A'}/10
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis ? (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-indigo-600">Summary</h3>
            <p className="text-gray-600">{analysis.summary || 'No summary available.'}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-indigo-600">Nutritional Balance</h3>
            <p className="text-gray-600">
              {analysis.nutritionalBalance || 'No nutritional balance data available.'}
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-indigo-600">Healthiness Trend</h3>
            <p className="text-gray-600">
              {analysis.healthinessTrend || 'No healthiness trend data available.'}
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-indigo-600">Recommendations</h3>
            {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 ? (
              <ul className="list-disc ml-6 text-gray-600">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No recommendations available.</p>
            )}
          </div>
        </div>
      ) : (
        !meals.length && (
          <p className="text-gray-600 text-lg">
            No analysis available. Log more meals to get insights!
          </p>
        )
      )}
    </motion.div>
  );
};

export default AIAnalysis;