import React, { useState, useEffect } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

ChartJS.register(ArcElement, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

const History = () => {
  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [calorieData, setCalorieData] = useState({ labels: [], datasets: [] });
  const [macroData, setMacroData] = useState({ labels: [], datasets: [] });
  const [stackedMacroData, setStackedMacroData] = useState({ labels: [], datasets: [] });
  const [healthinessData, setHealthinessData] = useState({ labels: [], datasets: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    minCalories: '',
    maxCalories: '',
    minHealthiness: '',
  });

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const fetchedMeals = response.data;
      setMeals(fetchedMeals);
      setFilteredMeals(fetchedMeals);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const calorieSums = last7Days.map((date) => {
        return fetchedMeals
          .filter((meal) => meal.consumed && meal.createdAt.split('T')[0] === date)
          .reduce((sum, meal) => sum + (meal.calories || 0), 0);
      });

      setCalorieData({
        labels: last7Days,
        datasets: [{
          label: 'Daily Calories',
          data: calorieSums,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        }],
      });

      const totalMacros = fetchedMeals
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
        datasets: [{
          data: [totalMacros.protein, totalMacros.carbs, totalMacros.fats],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          hoverOffset: 20,
        }],
      });

      const macroSums = last7Days.map((date) => {
        const dailyMeals = fetchedMeals.filter((meal) => meal.consumed && meal.createdAt.split('T')[0] === date);
        return {
          protein: dailyMeals.reduce((sum, meal) => sum + (meal.macronutrients?.protein || 0), 0),
          carbs: dailyMeals.reduce((sum, meal) => sum + (meal.macronutrients?.carbs || 0), 0),
          fats: dailyMeals.reduce((sum, meal) => sum + (meal.macronutrients?.fats || 0), 0),
        };
      });

      setStackedMacroData({
        labels: last7Days,
        datasets: [
          {
            label: 'Protein',
            data: macroSums.map(m => m.protein),
            backgroundColor: '#FF6384',
          },
          {
            label: 'Carbs',
            data: macroSums.map(m => m.carbs),
            backgroundColor: '#36A2EB',
          },
          {
            label: 'Fats',
            data: macroSums.map(m => m.fats),
            backgroundColor: '#FFCE56',
          },
        ],
      });

      const healthinessSums = last7Days.map((date) => {
        const dailyMeals = fetchedMeals.filter((meal) => meal.consumed && meal.createdAt.split('T')[0] === date);
        const totalHealthiness = dailyMeals.reduce((sum, meal) => sum + (meal.healthinessRating || 0), 0);
        return dailyMeals.length > 0 ? totalHealthiness / dailyMeals.length : 0;
      });

      setHealthinessData({
        labels: last7Days,
        datasets: [{
          label: 'Average Healthiness Rating',
          data: healthinessSums,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: true,
        }],
      });
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const applyFilters = () => {
    let result = [...meals];

    if (searchTerm) {
      result = result.filter(meal => meal.foodName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filters.dateStart) {
      result = result.filter(meal => new Date(meal.createdAt) >= new Date(filters.dateStart));
    }

    if (filters.dateEnd) {
      result = result.filter(meal => new Date(meal.createdAt) <= new Date(filters.dateEnd));
    }

    if (filters.minCalories) {
      result = result.filter(meal => meal.calories >= parseFloat(filters.minCalories));
    }

    if (filters.maxCalories) {
      result = result.filter(meal => meal.calories <= parseFloat(filters.maxCalories));
    }

    if (filters.minHealthiness) {
      result = result.filter(meal => meal.healthinessRating >= parseFloat(filters.minHealthiness));
    }

    result = result.sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'createdAt':
          return factor * (new Date(a.createdAt) - new Date(b.createdAt));
        case 'calories':
          return factor * ((a.calories || 0) - (b.calories || 0));
        case 'protein':
          return factor * ((a.macronutrients?.protein || 0) - (b.macronutrients?.protein || 0));
        case 'carbs':
          return factor * ((a.macronutrients?.carbs || 0) - (b.macronutrients?.carbs || 0));
        case 'fats':
          return factor * ((a.macronutrients?.fats || 0) - (b.macronutrients?.fats || 0));
        case 'healthinessRating':
          return factor * ((a.healthinessRating || 0) - (b.healthinessRating || 0));
        default:
          return 0;
      }
    });

    setFilteredMeals(result);
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, sortBy, sortOrder, filters, meals]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-800 mb-8 text-center">Calorie Tracker History</h1>

        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Filters & Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                name="dateStart"
                value={filters.dateStart}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                name="dateEnd"
                value={filters.dateEnd}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Min Calories</label>
              <input
                type="number"
                name="minCalories"
                value={filters.minCalories}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Max Calories</label>
              <input
                type="number"
                name="maxCalories"
                value={filters.maxCalories}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., 500"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Min Healthiness (0-10)</label>
              <input
                type="number"
                name="minHealthiness"
                value={filters.minHealthiness}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., 5"
                min="0"
                max="10"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Search Food</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Search by food name"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <div>
              <label className="block text-gray-600 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-2 border rounded-lg"
              >
                <option value="createdAt">Date</option>
                <option value="calories">Calories</option>
                <option value="protein">Protein</option>
                <option value="carbs">Carbs</option>
                <option value="fats">Fats</option>
                <option value="healthinessRating">Healthiness</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="p-2 border rounded-lg"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Daily Calorie Trend</h2>
            {calorieData.datasets.length === 0 || calorieData.datasets[0].data.every(val => val === 0) ? (
              <p className="text-gray-600">No calorie data available. Log meals to see trends!</p>
            ) : (
              <Line
                data={calorieData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' }, title: { display: true, text: 'Calories Over Last 7 Days' } },
                  scales: { y: { beginAtZero: true, title: { display: true, text: 'Calories (kcal)' } } },
                }}
              />
            )}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Macronutrient Distribution</h2>
            {macroData.datasets.length === 0 || macroData.datasets[0].data.every(val => val === 0) ? (
              <p className="text-gray-600">No macronutrient data available. Log meals to see distribution!</p>
            ) : (
              <Pie
                data={macroData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' }, title: { display: true, text: 'Macronutrients (g)' } },
                }}
              />
            )}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Daily Macronutrient Breakdown</h2>
            {stackedMacroData.datasets.length === 0 || stackedMacroData.datasets.every(ds => ds.data.every(val => val === 0)) ? (
              <p className="text-gray-600">No macronutrient data available. Log meals to see breakdown!</p>
            ) : (
              <Bar
                data={stackedMacroData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' }, title: { display: true, text: 'Macronutrients Per Day (g)' } },
                  scales: {
                    x: { stacked: true, title: { display: true, text: 'Date' } },
                    y: { stacked: true, title: { display: true, text: 'Grams' } },
                  },
                }}
              />
            )}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Healthiness Trend</h2>
            {healthinessData.datasets.length === 0 || healthinessData.datasets[0].data.every(val => val === 0) ? (
              <p className="text-gray-600">No healthiness data available. Log meals to see trends!</p>
            ) : (
              <Line
                data={healthinessData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' }, title: { display: true, text: 'Average Healthiness Over Last 7 Days' } },
                  scales: { y: { beginAtZero: true, max: 10, title: { display: true, text: 'Healthiness (0-10)' } } },
                }}
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Meal History</h2>
          {filteredMeals.length === 0 ? (
            <p className="text-gray-600">No meals match the current filters. Try adjusting your search or filters.</p>
          ) : (
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
                    <th className="p-4">Healthiness (0-10)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeals
                    .filter((meal) => meal.consumed)
                    .map((meal) => (
                      <tr key={meal._id} className="border-b hover:bg-indigo-50">
                        <td className="p-4">{new Date(meal.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">{meal.foodName}</td>
                        <td className="p-4">{meal.weight || 'N/A'}</td>
                        <td className="p-4">{meal.calories || 0}</td>
                        <td className="p-4">{meal.macronutrients?.protein || 0}</td>
                        <td className="p-4">{meal.macronutrients?.carbs || 0}</td>
                        <td className="p-4">{meal.macronutrients?.fats || 0}</td>
                        <td className="p-4">{meal.healthinessRating || 'N/A'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;