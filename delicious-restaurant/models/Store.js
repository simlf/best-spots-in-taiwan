const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slugs = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'You need to name your store!!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String]
});

storeSchema.pre('save', function(next) {
  if (!this.isModified('name')) {
    next(); //skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);
});

module.exports = mongoose.model('Store', storeSchema);
