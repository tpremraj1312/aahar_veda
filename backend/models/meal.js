import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodName: { type: String, required: true },
  weight: { type: Number }, // Made optional to prevent validation errors
  calories: { type: Number, required: true },
  macronutrients: {
    protein: { type: Number },
    carbs: { type: Number },
    fats: { type: Number },
  },
  healthinessRating: { type: Number },
  healthierAlternative: { type: String },
  imageUrl: { type: String },
  consumed: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Meal || mongoose.model('Meal', mealSchema);