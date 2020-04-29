const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!'
  },
  spot: {
    type: mongoose.Schema.ObjectId,
    ref: 'Spot',
    required: 'You must supply a spot!'
  },
  text: {
    type: String,
    required: 'Your review must have text!'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
});

// this will populate the author in the review so that we can see all the author (name, email...) instead of just it's ID
function autoPopulate(next) {
  this.populate('author');
  next();
}

reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Review', reviewSchema);
