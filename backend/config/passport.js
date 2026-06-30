const passport = require("passport");
const User = require("../models/User");
const Account = require("../models/Account");

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ── Google Strategy ────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@google.local`;
          const image = profile.photos && profile.photos[0] ? profile.photos[0].value : "";

          let user = await User.findOne({ provider: "google", email });
          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email,
              image,
              provider: "google",
            });
          }

          await Account.findOneAndUpdate(
            { provider: "google", providerAccountId: profile.id },
            {
              userId: user._id,
              provider: "google",
              providerAccountId: profile.id,
              access_token: accessToken,
              refresh_token: refreshToken,
            },
            { upsert: true, new: true }
          );

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

// ── GitHub Strategy ────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  const GitHubStrategy = require("passport-github2").Strategy;
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/auth/github/callback",
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@github.local`;
          const image = profile.photos && profile.photos[0] ? profile.photos[0].value : "";

          let user = await User.findOne({ provider: "github", email });
          if (!user) {
            user = await User.create({
              name: profile.displayName || profile.username,
              email,
              image,
              provider: "github",
            });
          }

          await Account.findOneAndUpdate(
            { provider: "github", providerAccountId: profile.id },
            {
              userId: user._id,
              provider: "github",
              providerAccountId: profile.id,
              access_token: accessToken,
              refresh_token: refreshToken,
            },
            { upsert: true, new: true }
          );

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

module.exports = passport;
