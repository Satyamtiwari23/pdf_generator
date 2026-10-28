const express = require("express");
const passport = require("../config/googleOAuth");

const router = express.Router();

// Start Google login
router.get(
  "/google-login",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: true,
  })
);

// Google redirects back here
router.get(
  "/google-login/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=google_login`,
  }),
  async (req, res, next) => {
    try {
      // Integrate with your existing JWT/session mechanism here.
      // Do not send a raw Google access token to your frontend.
      const code = await createOneTimeLoginCode(req.user);

      res.redirect(
        `${process.env.FRONTEND_URL}/oauth-success.html?code=${encodeURIComponent(code)}`
      );
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;