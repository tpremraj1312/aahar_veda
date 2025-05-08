import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Camera, ChartBar, Apple } from 'lucide-react';

const LandingPage = () => {
  const [quickFood, setQuickFood] = useState('');
  const [estimatedCalories, setEstimatedCalories] = useState(null);

  // Mock function for quick calorie estimation (to be replaced with backend API)
  const estimateCalories = () => {
    const mockCalories = {
      apple: 95,
      pizza: 266,
      salad: 150,
    };
    const calories = mockCalories[quickFood.toLowerCase()] || 100;
    setEstimatedCalories(calories);
  };

  // Testimonial data
  const testimonials = [
    { name: 'Jane D.', text: 'The photo scan feature is a game-changer! I track my meals effortlessly.' },
    { name: 'Mike S.', text: 'The visualizations help me stay on top of my nutrition goals.' },
    { name: 'Sarah L.', text: 'Beautiful design and super easy to use. Highly recommend!' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">CalorieWise</h1>
          <div className="space-x-4">
            <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
            <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition">Sign Up</Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.h2
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold text-gray-800 mb-4"
        >
          Track Your Calories with Ease
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-600 mb-8"
        >
          Scan your food, log your meals, and visualize your nutrition journey with CalorieWise.
        </motion.p>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg hover:bg-blue-700 transition">
            Get Started <ChevronRight className="inline w-5 h-5" />
          </Link>
        </motion.div>
        <div className="mt-10">
          <video autoPlay loop muted className="w-full max-w-2xl mx-auto rounded-lg shadow-lg">
            <source src="https://example.com/food-scan-demo.mp4" type="video/mp4" />
            {/* Replace with actual video or use a canvas animation */}
          </video>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-100 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">Why Choose CalorieWise?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Camera, title: 'Photo-Based Tracking', desc: 'Scan your food to instantly estimate calories and nutrients.' },
              { icon: ChartBar, title: 'Insightful Visualizations', desc: 'Track your progress with beautiful charts and graphs.' },
              { icon: Apple, title: 'Personalized Insights', desc: 'Get tailored nutrition advice based on your goals.' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition"
              >
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h4 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Calorie Estimator */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold text-gray-800 mb-8">Try Our Quick Calorie Estimator</h3>
        <div className="max-w-md mx-auto">
          <input
            type="text"
            value={quickFood}
            onChange={(e) => setQuickFood(e.target.value)}
            placeholder="Enter food name (e.g., Apple)"
            className="w-full p-3 rounded-lg border border-gray-300 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={estimateCalories}
            className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition"
          >
            Estimate Calories
          </button>
          {estimatedCalories && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-lg text-gray-600"
            >
              Estimated: {estimatedCalories} kcal
            </motion.p>
          )}
        </div>
      </section>

      {/* Testimonial Slider */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-12">What Our Users Say</h3>
          <div className="relative">
            <motion.div
              animate={{ x: ['0%', '-100%'] }}
              transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
              className="flex space-x-8"
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="min-w-[300px] bg-white text-gray-800 p-6 rounded-lg shadow-lg">
                  <p className="mb-4">{testimonial.text}</p>
                  <p className="font-semibold">{testimonial.name}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.h3
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-3xl font-bold text-gray-800 mb-8"
        >
          Ready to Start Your Nutrition Journey?
        </motion.h3>
        <Link to="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg hover:bg-blue-700 transition">
          Join Now <ChevronRight className="inline w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4">© 2025 CalorieWise. All rights reserved.</p>
          <div className="space-x-4">
            <a href="#" className="hover:text-blue-400">Privacy Policy</a>
            <a href="#" className="hover:text-blue-400">Terms of Service</a>
            <a href="#" className="hover:text-blue-400">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;