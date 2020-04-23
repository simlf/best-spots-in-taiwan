const mongoose = require('mongoose');
const User = mongoose.model('Store');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'register' });
}

// Validate that the data is correct (not corrupted, in the format requested...)
exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name').notEmpty();
  req.checkBody('email', 'That email is not valid').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password can\t be empty').notEmpty();
  req.checkBody('password', 'Oops, your password can\t be empty').notEmpty();
  req.checkBody('password-confirm', 'Oops, your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors(); // if there are errors in the registration validation then it'll be flashed to the user
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return;
  }
  next();
};

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next(); // pass to authController.login
};
