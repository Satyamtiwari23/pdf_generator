const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_LOGIN_REDIRECT_URI,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email || profile.emails?.[0]?.verified !== true) {
          return done(null, false);
        }

        // Replace this with your existing User model and
        // account lookup/create logic.
        const user = await findOrCreateGoogleUser({
          googleId: profile.id,
          name: profile.displayName,
          email,
          picture: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

module.exports = passport;