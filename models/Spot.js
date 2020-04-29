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
  // Add a relation between a the Spot and the User
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
},  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Define the indexes (so that the queries will be operated quicker)
spotSchema.index({
  name: 'text', // it sets the indexes as text so that we can perform a search
  description: 'text'
});

spotSchema.index({ location: '2dsphere' });

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
};

// find reviews where the spots _id property === reviews spot property
spotSchema.virtual('reviews', {
  ref: 'Review', // what model to link ?
  localField: '_id', // which field on the spot ?
  foreignField: 'spot' // which field on the review ?
});

module.exports = mongoose.model('Spot', spotSchema);
