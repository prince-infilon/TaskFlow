const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../models/User');
const Organization = require('../models/Organization');
const AuthAuditLog = require('../models/AuthAuditLog');

const handleOAuthLogin = async (provider, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    if (!email) {
      return done(null, false, { message: 'No email found from OAuth provider' });
    }

    let user = await User.findOne({ email });

    if (user) {
      // User exists, link provider if not already linked
      const hasProvider = user.providers.some(p => p.provider === provider && p.providerId === profile.id);
      if (!hasProvider) {
        user.providers.push({ provider, providerId: profile.id });
        await user.save();
        await AuthAuditLog.create({
          user: user._id,
          action: 'oauth_linked',
          metadata: { provider }
        });
      }
    } else {
      // User does not exist, create new user without passwordHash
      user = await User.create({
        name: profile.displayName || profile.username || email.split('@')[0],
        email,
        providers: [{ provider, providerId: profile.id }],
        avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null
      });

      // Create default org
      const org = new Organization({
        name: `${user.name}'s Workspace`,
        owner: user._id,
        members: [{ user: user._id, role: 'admin' }]
      });
      await org.save();
    }

    if (!user.isActive) {
      return done(null, false, { message: 'Account is deactivated.' });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  }, (accessToken, refreshToken, profile, done) => {
    handleOAuthLogin('google', profile, done);
  }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/auth/github/callback'
  }, (accessToken, refreshToken, profile, done) => {
    handleOAuthLogin('github', profile, done);
  }));
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: '/api/auth/microsoft/callback'
  }, (accessToken, refreshToken, profile, done) => {
    handleOAuthLogin('microsoft', profile, done);
  }));
}

module.exports = passport;
