const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  // check if the user is authenticated
  if (req.isAuthenticated()) {
  next(); // if yes, skip it
  return;
  }
  req.flash('error', 'You must be logged in...')
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
 // 1. See if a user with that email exists
 const user = await User.findOne({ email: req.body.email});
 if (!user) {
    req.flash('error', 'This email isn\t associated to any account');
    return res.redirect('/login');
 }
 // 2. Set reset tokens and expiry on their account
 user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
 user.resetPasswordExpires = Date.now() + 3600000;
 await user.save();
 // 3. Send them an email with the token
const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
req.flash('success', `Your password has been sent by mail. ${resetURL}`);
 // 4. Redirect to the login page
 res.redirect('/login');
};

exports.reset = async (req, res) => {
  // check if there is somebody with this token
  // check that the token is not expired
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'This token has expired or is not valid');
    return res.redirect('/login');
  }
  // Show the reset password form if there is a user
  res.render('reset', { title: 'Reset password' });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next(); // if the passwords match then pass it
    return;
  }
  req.flash('error', 'Your passwords must match');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'This token has expired or is not valid');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', 'Your password was succesfully modified');
  res.redirect('/');
};
