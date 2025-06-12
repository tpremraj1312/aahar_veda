import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [dailySummary, setDailySummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 50, carbs: 200, fats: 70 });
  const [recentMeals, setRecentMeals] = useState([]);
  const [chartData, setChartData] = useState({
    labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Calories Consumed',
      data: [0, 0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
    }],
  });
  const [macroData, setMacroData] = useState({
    labels: ['Protein', 'Carbs', 'Fats'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      hoverOffset: 20,
    }],
  });
  const [healthinessData, setHealthinessData] = useState({
    labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Average Healthiness Rating',
      data: [0, 0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
    }],
  });
  const [mealSuggestion, setMealSuggestion] = useState({ name: '', calories: 0 });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [timeoutReached, setTimeoutReached] = useState(false);
  const navigate = useNavigate();
  const fetchInProgress = useRef(false);
  const toastId = useRef(null);

  const API_URL = 'http://localhost:5000/api';

  const showToast = (message, type = 'error') => {
    console.log(`[Toast] Showing ${type} toast: ${message}`);
    if (!toastId.current || !toast.isActive(toastId.current)) {
      toastId.current = toast[type](message, { autoClose: 5000 });
    }
  };

  const aggregateWeeklyCalories = (meals) => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const calorieData = Array(7).fill(0);
    meals.forEach(meal => {
      if (meal.createdAt) {
        const date = new Date(meal.createdAt);
        const dayIndex = date.getDay();
        const adjustedIndex = (dayIndex + 6) % 7;
        calorieData[adjustedIndex] += meal.calories || 0;
      }
    });
    return {
      labels: days,
      datasets: [{
        label: 'Calories Consumed',
        data: calorieData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
      }],
    };
  };

  const aggregateHealthiness = (meals) => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const healthinessData = Array(7).fill(0);
    const counts = Array(7).fill(0);
    meals.forEach(meal => {
      if (meal.createdAt && meal.healthinessRating) {
        const date = new Date(meal.createdAt);
        const dayIndex = date.getDay();
        const adjustedIndex = (dayIndex + 6) % 7;
        healthinessData[adjustedIndex] += meal.healthinessRating;
        counts[adjustedIndex] += 1;
      }
    });
    const averages = healthinessData.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
    return {
      labels: days,
      datasets: [{
        label: 'Average Healthiness Rating',
        data: averages,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }],
    };
  };

  const fetchData = async (retryCount = 0, maxRetries = 2) => {
    if (fetchInProgress.current) {
      console.log('[fetchData] Fetch already in progress, exiting');
      return;
    }

    fetchInProgress.current = true;
    setLoading(true);
    setErrors({});
    setTimeoutReached(false);
    console.log('[fetchData] Set loading: true, cleared errors and timeoutReached');

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[fetchData] No token found, redirecting to login');
      showToast('Please log in to access the dashboard');
      navigate('/login');
      fetchInProgress.current = false;
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[fetchData] Timeout reached, aborting request');
      controller.abort();
      setTimeoutReached(true);
      showToast('Request timed out. Please check your connection.');
      fetchInProgress.current = false;
      setLoading(false);
    }, 10000);

    const endpoints = [
      {
        name: 'summary',
        url: `${API_URL}/dashboard/summary`,
        setter: (data) => {
          const summary = data || { calories: 0, protein: 0, carbs: 0, fats: 0 };
          console.log('[fetchData] Setting summary data:', summary);
          setDailySummary(summary);
          setMacroData({
            labels: ['Protein', 'Carbs', 'Fats'],
            datasets: [{
              data: [summary.protein || 0, summary.carbs || 0, summary.fats || 0],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
              hoverOffset: 20,
            }],
          });
        },
      },
      {
        name: 'goals',
        url: `${API_URL}/dashboard/goals`,
        setter: (data) => {
          const goalsData = data || { calories: 2000, protein: 50, carbs: 200, fats: 70 };
          console.log('[fetchData] Setting goals data:', goalsData);
          setGoals(goalsData);
        },
      },
      {
        name: 'recentMeals',
        url: `${API_URL}/dashboard/recent-meals`,
        setter: (data) => {
          const meals = (data || []).map(meal => ({
            id: meal._id,
            food: meal.foodName || 'Unknown',
            calories: meal.calories || 0,
            weight: meal.weight || null,
            protein: meal.macronutrients?.protein || 0,
            carbs: meal.macronutrients?.carbs || 0,
            fats: meal.macronutrients?.fats || 0,
            healthinessRating: meal.healthinessRating || null,
            healthierAlternative: meal.healthierAlternative || null,
            imageUrl: meal.imageUrl || null,
            createdAt: meal.createdAt,
            time: meal.createdAt ? new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          }));
          console.log('[fetchData] Setting recentMeals data:', meals);
          setRecentMeals(meals);
          if (!chartData.datasets[0].data.some(val => val > 0)) {
            const aggregatedChartData = aggregateWeeklyCalories(meals);
            console.log('[fetchData] Setting chartData from recentMeals:', aggregatedChartData);
            setChartData(aggregatedChartData);
          }
          const healthinessChartData = aggregateHealthiness(meals);
          console.log('[fetchData] Setting healthinessData:', healthinessChartData);
          setHealthinessData(healthinessChartData);
        },
      },
      {
        name: 'trend',
        url: `${API_URL}/dashboard/trend`,
        setter: (data) => {
          console.log('[fetchData] Processing trend data:', data);
          if (data?.datasets?.[0]?.data && Array.isArray(data.datasets[0].data) && data.datasets[0].data.length === 7) {
            console.log('[fetchData] Setting chartData:', data);
            setChartData(data);
          } else {
            console.log('[fetchData] Invalid trend data, using recentMeals fallback');
            const aggregatedChartData = aggregateWeeklyCalories(recentMeals);
            setChartData(aggregatedChartData);
          }
        },
      },
      {
        name: 'suggestion',
        url: `${API_URL}/dashboard/suggestion`,
        setter: (data) => {
          const suggestion = data || { name: '', calories: 0 };
          console.log('[fetchData] Setting suggestion data:', suggestion);
          setMealSuggestion(suggestion);
        },
      },
    ];

    console.log('[fetchData] Endpoints to fetch:', endpoints.map(e => e.url));

    try {
      const results = await Promise.allSettled(
        endpoints.map(async ({ name, url, setter }) => {
          console.log(`[fetchData] Fetching ${name} from ${url}`);
          const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          console.log(`[fetchData] Fetched ${name} successfully:`, response.data);
          setter(response.data);
          return { name, status: 'fulfilled' };
        })
      );

      clearTimeout(timeoutId);
      console.log('[fetchData] Cleared timeout, processing results:', results);

      const newErrors = {};
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const { name } = endpoints[index];
          newErrors[name] = result.reason?.response?.data?.error || `Failed to load ${name}`;
          console.log(`[fetchData] Error for ${name}:`, newErrors[name]);
        }
      });

      setErrors(newErrors);
      setLoading(false);
      console.log('[fetchData] Set loading: false, errors:', newErrors);
      fetchInProgress.current = false;
      console.log('[fetchData] Fetch completed, fetchInProgress: false');
    } catch (err) {
      clearTimeout(timeoutId);
      fetchInProgress.current = false;
      console.log('[fetchData] Global error caught:', err.message);

      if (err.name === 'AbortError') {
        console.log('[fetchData] Fetch aborted due to timeout');
        setLoading(false);
        return;
      }

      let newErrors = {};
      if (err.response) {
        const { status, data, config } = err.response;
        const failedEndpoint = endpoints.find(e => e.url === config.url);
        console.log(`[fetchData] Response error for ${failedEndpoint?.name}: ${status} - ${data?.error}`);

        if (status === 401) {
          console.log('[fetchData] Unauthorized, redirecting to login');
          localStorage.removeItem('token');
          navigate('/login');
          showToast('Session expired. Please log in again.');
          setLoading(false);
          return;
        }

        newErrors = {
          [failedEndpoint?.name]: status === 404
            ? `Endpoint not found: ${failedEndpoint.url}`
            : data?.error || `Error loading ${failedEndpoint?.name}`,
        };
      } else {
        newErrors = Object.fromEntries(
          endpoints.map(e => [e.name, 'Network error or server unreachable'])
        );
        console.log('[fetchData] Network error, setting errors for all endpoints:', newErrors);
      }

      setErrors(newErrors);
      setLoading(false);
      console.log('[fetchData] Set loading: false, errors:', newErrors);

      if (retryCount < maxRetries && Object.keys(newErrors).length > 0) {
        console.log(`[fetchData] Retrying fetch (attempt ${retryCount + 2})`);
        setTimeout(() => fetchData(retryCount + 1, maxRetries), 1000);
      } else if (Object.keys(newErrors).length > 0) {
        showToast('Failed to load some dashboard data. Please try again.');
      }
    }
  };

  useEffect(() => {
    console.log('[useEffect] Mounting component, initiating fetchData');
    fetchData();
  }, [navigate]);

  const handleDeleteMeal = async (id) => {
    console.log('[handleDeleteMeal] Deleting meal with id:', id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[handleDeleteMeal] No token, redirecting to login');
        showToast('Please log in to delete a meal');
        navigate('/login');
        return;
      }
      await axios.delete(`${API_URL}/meal/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedMeals = recentMeals.filter(meal => meal.id !== id);
      setRecentMeals(updatedMeals);
      console.log('[handleDeleteMeal] Meal deleted, updated recentMeals');
      const aggregatedChartData = aggregateWeeklyCalories(updatedMeals);
      setChartData(aggregatedChartData);
      const healthinessChartData = aggregateHealthiness(updatedMeals);
      setHealthinessData(healthinessChartData);
      showToast('Meal deleted successfully', 'success');
    } catch (err) {
      console.log('[handleDeleteMeal] Error:', err.message);
      showToast(err.response?.data?.error || 'Failed to delete meal');
    }
  };

  const Skeleton = ({ className }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
  );

  if (loading && !timeoutReached && Object.keys(dailySummary).length === 0 && recentMeals.length === 0) {
    console.log('[Render] Showing loading skeleton: no data available');
    return (
      <div>
        <section className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </section>
        <section className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill().map((_, i) => (
              <Skeleton key={i} className="h-24 w-24 mx-auto" />
            ))}
          </div>
        </section>
        <section className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full" />
        </section>
      </div>
    );
  }

  if (timeoutReached || Object.keys(errors).length === 5) {
    console.log('[Render] Showing error screen: timeout or all endpoints failed', errors);
    return (
      <div className="p-6 bg-red-100 text-red-700 rounded-xl shadow-lg">
        <p>Unable to load dashboard data. Please check your connection or try again later.</p>
        {Object.keys(errors).length > 0 && (
          <ul className="list-disc ml-4 mt-2">
            {Object.entries(errors).map(([key, msg]) => (
              <li key={key}>{key}: {msg}</li>
            ))}
          </ul>
        )}
        <button
          onClick={() => fetchData()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  console.log('[Render] Rendering main dashboard UI, errors:', errors);
  console.log('[Render] dailySummary:', dailySummary);
  console.log('[Render] goals:', goals);
  console.log('[Render] recentMeals:', recentMeals);
  console.log('[Render] chartData:', chartData);
  console.log('[Render] macroData:', macroData);
  console.log('[Render] healthinessData:', healthinessData);
  console.log('[Render] mealSuggestion:', mealSuggestion);

  return (
    <div>
      {Object.keys(errors).length > 0 && (
        <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-xl shadow-lg">
          <p>Some data failed to load:</p>
          <ul className="list-disc ml-4">
            {Object.entries(errors).map(([key, msg]) => (
              <li key={key}>{key}: {msg}</li>
            ))}
          </ul>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      )}

      <h1 className="text-4xl font-bold text-indigo-800 mb-8 text-center">Your Nutrition Dashboard</h1>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Today's Summary</h2>
        {dailySummary.calories === 0 && dailySummary.protein === 0 && dailySummary.carbs === 0 && dailySummary.fats === 0 ? (
          <p className="text-gray-600">No consumption data logged for today. <Link to="/add-meal" className="text-indigo-600 hover:underline">Add a meal</Link> to see your progress!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-gray-600">Calories Consumed</p>
              <p className="text-3xl font-semibold text-indigo-600">{dailySummary.calories} kcal</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-gray-600">Daily Goal</p>
              <p className="text-3xl font-semibold text-indigo-600">{goals.calories} kcal</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-gray-600">Remaining Calories</p>
              <p className="text-3xl font-semibold text-indigo-600">{Math.max(0, goals.calories - dailySummary.calories)} kcal</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-gray-600">Progress</p>
              <p className="text-3xl font-semibold text-indigo-600">{Math.round((dailySummary.calories / goals.calories) * 100)}%</p>
            </div>
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Nutrition Goals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Calories', value: goals.calories ? (dailySummary.calories / goals.calories) * 100 : 0 },
            { label: 'Protein', value: goals.protein ? (dailySummary.protein / goals.protein) * 100 : 0 },
            { label: 'Carbs', value: goals.carbs ? (dailySummary.carbs / goals.carbs) * 100 : 0 },
            { label: 'Fats', value: goals.fats ? (dailySummary.fats / goals.fats) * 100 : 0 },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray={`${Math.min(item.value, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold">{Math.round(Math.min(item.value, 100))}%</span>
                </div>
              </div>
              <p className="mt-2 text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Macronutrient Distribution</h2>
        {macroData.datasets[0].data.every(val => val === 0) ? (
          <p className="text-gray-600">No macronutrient data available. Log meals to see distribution!</p>
        ) : (
          <div className="max-w-md mx-auto">
            <Pie
              data={macroData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Today\'s Macronutrients (g)' } },
              }}
            />
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Weekly Calorie Trend</h2>
        {chartData.datasets[0].data.every(val => val === 0) ? (
          <p className="text-gray-600">No calorie data available for this week. Log meals to see your trends!</p>
        ) : (
          <Line
            data={chartData}
            options={{
              responsive: true,
              scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Calories (kcal)' } },
                x: { title: { display: true, text: 'Day of Week' } },
              },
              plugins: { legend: { position: 'top' }, title: { display: true, text: 'Calories Over Last 7 Days' } },
            }}
          />
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Healthiness Trend</h2>
        {healthinessData.datasets[0].data.every(val => val === 0) ? (
          <p className="text-gray-600">No healthiness data available. Log meals to see your trends!</p>
        ) : (
          <Line
            data={healthinessData}
            options={{
              responsive: true,
              scales: {
                y: { beginAtZero: true, max: 10, title: { display: true, text: 'Healthiness (0-10)' } },
                x: { title: { display: true, text: 'Day of Week' } },
              },
              plugins: { legend: { position: 'top' }, title: { display: true, text: 'Average Healthiness Over Last 7 Days' } },
            }}
          />
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recent Meals</h2>
        {recentMeals.length === 0 ? (
          <p className="text-gray-600">
            No meals logged yet. <Link to="/add-meal" className="text-indigo-600 hover:underline">Add a meal</Link> to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-indigo-100 text-indigo-800">
                  <th className="p-4">Food</th>
                  <th className="p-4">Calories</th>
                  <th className="p-4">Weight</th>
                  <th className="p-4">Protein</th>
                  <th className="p-4">Carbs</th>
                  <th className="p-4">Fats</th>
                  <th className="p-4">Healthiness</th>
                  <th className="p-4">Healthier Alternative</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentMeals.map((meal) => (
                  <tr key={meal.id} className="border-b hover:bg-indigo-50">
                    <td className="p-4">{meal.food || 'Unknown'}</td>
                    <td className="p-4">{meal.calories ? `${meal.calories} kcal` : '0 kcal'}</td>
                    <td className="p-4">{meal.weight ? `${meal.weight}g` : '-'}</td>
                    <td className="p-4">{meal.protein ? `${meal.protein}g` : '-'}</td>
                    <td className="p-4">{meal.carbs ? `${meal.carbs}g` : '-'}</td>
                    <td className="p-4">{meal.fats ? `${meal.fats}g` : '-'}</td>
                    <td className="p-4">{meal.healthinessRating ? `${meal.healthinessRating}/10` : '-'}</td>
                    <td className="p-4">{meal.healthierAlternative || '-'}</td>
                    <td className="p-4">{meal.time || '-'}</td>
                    <td className="p-4">
                      <button className="text-indigo-600 hover:underline mr-2">Edit</button>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-white p-6 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Meal Suggestion</h2>
        <p className="text-gray-600">
          Try a <span className="font-semibold">{mealSuggestion.name || 'healthy meal'}</span> for only{' '}
          <span className="font-semibold">{mealSuggestion.calories || 0} kcal</span>!
        </p>
      </motion.section>
    </div>
  );
};

export default Dashboard;