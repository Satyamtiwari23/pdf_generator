
const express = require("express");
const mongoose = require("mongoose");

module.exports = function ({ authenticateToken, connectDB, User }) {
  const router = express.Router();

  // --------------------------------------------------
  // FEEDBACK MODEL
  // One feedback document per user.
  // --------------------------------------------------

  const feedbackSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
      },

      name: {
        type: String,
        required: true,
        trim: true
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
      },

      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
          validator: Number.isInteger,
          message: "Rating must be a whole number from 1 to 5."
        }
      },

      suggestion: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
      },

      page: {
        type: String,
        default: "dashboard",
        maxlength: 50
      }
    },
    {
      timestamps: true
    }
  );

  const Feedback =
    mongoose.models.Feedback ||
    mongoose.model("Feedback", feedbackSchema);

  // --------------------------------------------------
  // GET: CURRENT USER'S PREVIOUS FEEDBACK
  // GET /api/feedback/mine
  // --------------------------------------------------

  router.get("/mine", authenticateToken, async (req, res) => {
    try {
      await connectDB();

      const feedback = await Feedback.findOne({
        userId: req.user.id
      }).select("rating suggestion createdAt");

      if (!feedback) {
        return res.json(null);
      }

      return res.json(feedback);

    } catch (error) {
      console.error("Fetch feedback error:", error);

      return res.status(500).json({
        message: "Unable to load your previous feedback."
      });
    }
  });

  // --------------------------------------------------
  // POST: SUBMIT OR UPDATE FEEDBACK
  // POST /api/feedback
  // --------------------------------------------------

  router.post("/", authenticateToken, async (req, res) => {
    try {
      await connectDB();

      const { rating, suggestion, page } = req.body;

      // Validate rating
      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          message: "Please select a valid rating from 1 to 5."
        });
      }

      // Validate suggestion
      if (
        suggestion !== undefined &&
        typeof suggestion !== "string"
      ) {
        return res.status(400).json({
          message: "Invalid suggestion."
        });
      }

      const cleanSuggestion = (suggestion || "").trim();

      if (cleanSuggestion.length > 1000) {
        return res.status(400).json({
          message: "Suggestion cannot exceed 1000 characters."
        });
      }

      // Get identity from the authenticated database user.
      // Never trust name/email sent by the frontend.
      const user = await User.findById(req.user.id)
        .select("name email");

      if (!user) {
        return res.status(404).json({
          message: "User account not found."
        });
      }

      // Create the first rating or update the existing one.
      const feedback = await Feedback.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            name: user.name,
            email: user.email,
            rating,
            suggestion: cleanSuggestion,
            page: typeof page === "string"
              ? page.slice(0, 50)
              : "dashboard"
          }
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      ).select("rating suggestion createdAt");

      return res.status(200).json({
        message: "Thank you for your feedback!",
        feedback
      });

    } catch (error) {
      console.error("Submit feedback error:", error);

      return res.status(500).json({
        message: "Unable to save your feedback. Please try again."
      });
    }
  });

  return router;
};
