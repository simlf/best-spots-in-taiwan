const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email adress'],
    required: 'Please enter a valid email'
  },
  name: {
    type: String,
    trim: true,
    required: 'Please enter a name'
  }
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' }); // it will create a password
userSchema.plugin(mongodbErrorHandler); // this lets the user have more comprehensive error messages

module.exports = mongoose.model('User', userSchema);
