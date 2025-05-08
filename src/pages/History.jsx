import React, { useState, useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

const History = () => {
  const [meals, setMeals] = useState([]);
  const [calorieData, setCalorieData] = useState({ labels: [], datasets: [] });
  const [macroData, setMacroData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get('/api/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setMeals(response.data);

        // Prepare data for line chart (calories over last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const calorieSums = last7Days.map((date) => {
          return response.data
            .filter((meal) => meal.consumed && meal.createdAt.split('T')[0] === date)
            .reduce((sum, meal) => sum + meal.calories, 0);
        });

        setCalorieData({
          labels: last7Days,
          datasets: [
            {
              label: 'Daily Calories',
              data: calorieSums,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.4,
              fill: true,
            },
          ],
        });

        // Prepare data for pie chart (macronutrients for all consumed meals)
        const totalMacros = response.data
          .filter((meal) => meal.consumed)
          .reduce(
            (acc, meal) => ({
              protein: acc.protein + (meal.macronutrients?.protein || 0),
              carbs: acc.carbs + (meal.macronutrients?.carbs || 0),
              fats: acc.fats + (meal.macronutrients?.fats || 0),
            }),
            { protein: 0, carbs: 0, fats: 0 }
          );

        setMacroData({
          labels: ['Protein', 'Carbs', 'Fats'],
          datasets: [
            {
              data: [totalMacros.protein, totalMacros.carbs, totalMacros.fats],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
              hoverOffset: 20,
            },
          ],
        });
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-800 mb-8 text-center">Calorie Tracker History</h1>

        {/* Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Daily Calorie Trend</h2>
            <Line
              data={calorieData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Calories Over Last 7 Days' } },
              }}
            />
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Macronutrient Distribution</h2>
            <Pie
              data={macroData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Macronutrients (g)' } },
              }}
            />
          </div>
        </div>

        {/* Meal History Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Meal History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-indigo-100 text-indigo-800">
                  <th className="p-4">Date</th>
                  <th className="p-4">Food Name</th>
                  <th className="p-4">Weight (g)</th>
                  <th className="p-4">Calories (kcal)</th>
                  <th className="p-4">Protein (g)</th>
                  <th className="p-4">Carbs (g)</th>
                  <th className="p-4">Fats (g)</th>
                </tr>
              </thead>
              <tbody>
                {meals
                  .filter((meal) => meal.consumed)
                  .map((meal) => (
                    <tr key={meal._id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{new Date(meal.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">{meal.foodName}</td>
                      <td className="p-4">{meal.weight || 'N/A'}</td>
                      <td className="p-4">{meal.calories}</td>
                      <td className="p-4">{meal.macronutrients?.protein || 0}</td>
                      <td className="p-4">{meal.macronutrients?.carbs || 0}</td>
                      <td className="p-4">{meal.macronutrients?.fats || 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;