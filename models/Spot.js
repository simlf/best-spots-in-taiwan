const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const spotSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a spot name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'Please enter the coordinates!'
    }],
    address: {
      type: String,
      required: 'Please enter an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
});

// Define the indexes (so that the queries will be operated quicker)
spotSchema.index({
  name: 'text', // it sets the indexes as text
  description: 'text'
});

spotSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);

  // Find if there are already spots with the same slug
  const slugRegEx = new RegExp (`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const spotsWithSlug = await this.constructor.find({ slug: slugRegEx});
  // If there is already spots with the same slug, then this Spot slug should be different
  if (spotsWithSlug.length) {
    this.slug = `${this.slug}-${spotsWithSlug.length - 1}`;
  }

  next();
});

spotSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $sortByCount: '$tags' }
    ]);
}

module.exports = mongoose.model('Spot', spotSchema);
