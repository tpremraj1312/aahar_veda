import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Home, Camera, History, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [dailySummary, setDailySummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 50, carbs: 200, fats: 70 });
  const [recentMeals, setRecentMeals] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ label: 'Calories Consumed', data: [], borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.2)' }],
  });
  const [mealSuggestion, setMealSuggestion] = useState({ name: '', calories: 0 });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [timeoutReached, setTimeoutReached] = useState(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const toastId = useRef(null);

  const API_URL = 'http://localhost:5000/api';

  // Debounce toast to prevent spamming
  const showToast = (message) => {
    if (!toastId.current || !toast.isActive(toastId.current)) {
      toastId.current = toast.error(message, { autoClose: 5000 });
    }
  };

  // Fetch all dashboard data with timeout
  useEffect(() => {
    console.log('Dashboard useEffect triggered');
    const controller = new AbortController();
    let fetchCount = 0;

    const fetchWithTimeout = async (url, options, timeout = 5000) => {
      const startTime = Date.now();
      console.log(`Starting fetch for ${url}`);
      const timeoutController = new AbortController();
      const id = setTimeout(() => timeoutController.abort(), timeout);
      try {
        const response = await axios({
          ...options,
          url,
          signal: timeoutController.signal,
        });
        clearTimeout(id);
        console.log(`Fetch for ${url} completed in ${Date.now() - startTime}ms`);
        return { status: 'fulfilled', value: response.data };
      } catch (err) {
        clearTimeout(id);
        console.log(`Fetch for ${url} failed after ${Date.now() - startTime}ms:`, err.message);
        return { status: 'rejected', reason: err };
      }
    };

    const fetchData = async () => {
      if (fetchInProgress.current) {
        console.log('Fetch already in progress, skipping...');
        return;
      }
      fetchInProgress.current = true;

      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to access the dashboard');
        navigate('/login');
        fetchInProgress.current = false;
        return;
      }

      fetchCount += 1;
      console.log(`Fetch attempt #${fetchCount}`);

      setLoading(true);
      setErrors({});
      setTimeoutReached(false);
      console.log('Set loading to true');

      const hardTimeout = setTimeout(() => {
        if (isMounted.current) {
          setTimeoutReached(true);
          setLoading(false);
          showToast('Loading took too long. Please check your connection and try again.');
          fetchInProgress.current = false;
          console.log('Hard timeout reached, set loading to false');
        }
      }, 15000);

      const requests = [
        {
          name: 'summary',
          promise: fetchWithTimeout(`${API_URL}/dashboard/summary`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        },
        {
          name: 'goals',
          promise: fetchWithTimeout(`${API_URL}/dashboard/goals`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        },
        {
          name: 'meals',
          promise: fetchWithTimeout(`${API_URL}/meal`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        },
        {
          name: 'trend',
          promise: fetchWithTimeout(`${API_URL}/dashboard/trend`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        },
        {
          name: 'suggestion',
          promise: fetchWithTimeout(`${API_URL}/dashboard/suggestion`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        },
      ];

      const results = await Promise.allSettled(requests.map(req => req.promise));

      clearTimeout(hardTimeout);

      const newErrors = {};
      const newState = {
        dailySummary: dailySummary,
        goals: goals,
        recentMeals: recentMeals,
        chartData: chartData,
        mealSuggestion: mealSuggestion,
      };

      results.forEach((result, index) => {
        const { name } = requests[index];
        if (result.status === 'fulfilled' && isMounted.current) {
          switch (name) {
            case 'summary':
              newState.dailySummary = result.value;
              break;
            case 'goals':
              newState.goals = result.value;
              break;
            case 'meals':
              newState.recentMeals = result.value.map(meal => ({
                id: meal._id,
                food: meal.foodName,
                calories: meal.calories,
                time: new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }));
              break;
            case 'trend':
              // Ensure chartData.datasets.data is a valid array
              const trendData = result.value;
              if (trendData.datasets && trendData.datasets[0] && Array.isArray(trendData.datasets[0].data)) {
                newState.chartData = trendData;
              } else {
                console.error('Invalid chartData format:', trendData);
                newErrors['trend'] = 'Invalid trend data format';
              }
              break;
            case 'suggestion':
              newState.mealSuggestion = result.value;
              break;
            default:
              break;
          }
        } else if (result.status === 'rejected') {
          console.error(`Error fetching ${name}:`, result.reason.message, result.reason.response?.data);
          newErrors[name] = result.reason.response?.data?.error || `Failed to load ${name} data`;
          if (result.reason.response?.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
          }
        }
      });

      if (isMounted.current) {
        setDailySummary(newState.dailySummary);
        setGoals(newState.goals);
        setRecentMeals(newState.recentMeals);
        setChartData(newState.chartData);
        setMealSuggestion(newState.mealSuggestion);
        setErrors(newErrors);
        setLoading(false);
        fetchInProgress.current = false;
        console.log('Set loading to false, state updated:', {
          dailySummary: newState.dailySummary,
          goals: newState.goals,
          recentMeals: newState.recentMeals,
          chartData: newState.chartData,
          mealSuggestion: newState.mealSuggestion,
          errors: newErrors,
        });
        if (Object.keys(newErrors).length > 0) {
          showToast('Some dashboard data failed to load. Please try again.');
        }
      }
    };

    fetchData();

    return () => {
      console.log('Dashboard useEffect cleanup');
      isMounted.current = false;
      controller.abort();
      fetchInProgress.current = false;
    };
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Handle meal deletion
  const handleDeleteMeal = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/meal/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentMeals(recentMeals.filter(meal => meal.id !== id));
      toast.success('Meal deleted successfully');
      // Refresh meals list after deletion
      const fetchData = async () => {
        const token = localStorage.getItem('token');
        const mealsRes = await axios.get(`${API_URL}/meal`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecentMeals(mealsRes.data.map(meal => ({
          id: meal._id,
          food: meal.foodName,
          calories: meal.calories,
          time: new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })));
      };
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete meal');
    }
  };

  // Skeleton placeholder component
  const Skeleton = ({ className }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
  );

  if (loading && !timeoutReached) {
    console.log('Rendering skeleton UI, loading:', loading, 'timeoutReached:', timeoutReached);
    return (
      <div className="flex min-h-screen bg-gray-100">
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-64 bg-blue-600 text-white p-6"
        >
          <h1 className="text-2xl font-bold mb-8">CalorieWise</h1>
          <nav className="space-y-4">
            {[
              { icon: Home, label: 'Home', to: '/dashboard' },
              { icon: Camera, label: 'Add Meal', to: '/add-meal' },
              { icon: History, label: 'History', to: '/history' },
              { icon: Settings, label: 'Settings', to: '/settings' },
            ].map((item, index) => (
              <Link
                key={index}
                to={item.to}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-700 transition"
              >
                <item.icon className="w-6 h-6" />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-700 transition w-full"
            >
              <LogOut className="w-6 h-6" />
              <span>Logout</span>
            </button>
          </nav>
        </motion.aside>
        <main className="flex-1 p-8">
          <section className="bg-white p-6 rounded-lg shadow-md mb-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </section>
          <section className="bg-white p-6 rounded-lg shadow-md mb-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(4).fill().map((_, i) => (
                <Skeleton key={i} className="h-24 w-24 mx-auto" />
              ))}
            </div>
          </section>
          <section className="bg-white p-6 rounded-lg shadow-md mb-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-24 w-full" />
          </section>
        </main>
      </div>
    );
  }

  if (timeoutReached || Object.keys(errors).length === 5) {
    console.log('Rendering error UI, timeoutReached:', timeoutReached, 'errors:', errors);
    return (
      <div className="flex min-h-screen bg-gray-100">
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-64 bg-blue-600 text-white p-6"
        >
          <h1 className="text-2xl font-bold mb-8">CalorieWise</h1>
          <nav className="space-y-4">
            {[
              { icon: Home, label: 'Home', to: '/dashboard' },
              { icon: Camera, label: 'Add Meal', to: '/add-meal' },
              { icon: History, label: 'History', to: '/history' },
              { icon: Settings, label: 'Settings', to: '/settings' },
            ].map((item, index) => (
              <Link
                key={index}
                to={item.to}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-700 transition"
              >
                <item.icon className="w-6 h-6" />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-700 transition w-full"
            >
              <LogOut className="w-6 h-6" />
              <span>Logout</span>
            </button>
          </nav>
        </motion.aside>
        <main className="flex-1 p-8">
          <div className="p-6 bg-red-100 text-red-700 rounded-lg">
            <p>Unable to load dashboard data. Please check your connection or try again later.</p>
            {Object.keys(errors).length > 0 && (
              <ul className="list-disc ml-4 mt-2">
                {Object.entries(errors).map(([key, msg]) => (
                  <li key={key}>{key}: {msg}</li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    );
  }

  console.log('Rendering main UI, state:', { dailySummary, goals, recentMeals, chartData, mealSuggestion });
  return (
    <div className="flex min-h-screen bg-gray-100">
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 bg-blue-600 text-white p-6"
      >
        <h1 className="text-2xl font-bold mb-8">CalorieWise</h1>
        <nav className="space-y-4">
          {[
            { icon: Home, label: 'Home', to: '/dashboard' },
            { icon: Camera, label: 'Add Meal', to: '/add-meal' },
            { icon: History, label: 'History', to: '/history' },
            { icon: Settings, label: 'Settings', to: '/settings' },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.to}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-700 transition"
            >
              <item.icon className="w-6 h-6" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-700 transition w-full"
          >
            <LogOut className="w-6 h-6" />
            <span>Logout</span>
          </button>
        </nav>
      </motion.aside>

      <main className="flex-1 p-8">
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            <p>Some data failed to load:</p>
            <ul className="list-disc ml-4">
              {Object.entries(errors).map(([key, msg]) => (
                <li key={key}>{key}: {msg}</li>
              ))}
            </ul>
          </div>
        )}

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Today’s Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600">Calories Consumed</p>
              <p className="text-3xl font-semibold text-blue-600">{dailySummary.calories} kcal</p>
            </div>
            <div>
              <p className="text-gray-600">Daily Goal</p>
              <p className="text-3xl font-semibold text-blue-600">{goals.calories} kcal</p>
            </div>
            <div>
              <p className="text-gray-600">Motivation</p>
              <p className="text-lg text-gray-800">You’re doing great! Keep it up!</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Nutrition Goals</h2>
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
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Meals</h2>
          {recentMeals.length === 0 ? (
            <p className="text-gray-600">No meals logged yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-600">
                  <th>Food</th>
                  <th>Calories</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentMeals.map((meal) => (
                  <tr key={meal.id} className="border-t">
                    <td className="py-2">{meal.food}</td>
                    <td>{meal.calories} kcal</td>
                    <td>{meal.time}</td>
                    <td>
                      <button className="text-blue-600 hover:underline mr-2">Edit</button>
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
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Meal Suggestion</h2>
          <p className="text-gray-600">
            Try a <span className="font-semibold">{mealSuggestion.name}</span> for only{' '}
            <span className="font-semibold">{mealSuggestion.calories} kcal</span>!
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Weekly Calorie Trend</h2>
          <Line data={chartData} options={{ responsive: true }} />
        </motion.section>
      </main>
    </div>
  );
};

export default Dashboard;