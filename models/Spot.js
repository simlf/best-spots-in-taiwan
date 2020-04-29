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

// When the query is long, the best practice is write a function in the Model instead of the controller
spotSchema.statics.getTagsList = function() {
  return this.aggregate([ // it will return the promise (i.e => check getTagsList in the controller)
    { $unwind: '$tags' },
    { $sortByCount: '$tags' }
    ]);
};

spotSchema.statics.getTopSpots = function() {
  return this.aggregate([
    // 1 - Lookup spots and populate their review
    // $lookup: from: 'reviews' -> is the equivalent of ref: 'Review' (i.e virtual mongoose)
    { $lookup:
      { from: 'reviews', localField: '_id', foreignField: 'spot', as: 'reviews' }
    },
    // 2 - Filter for only items that have more than 2 reviews
    // 'reviews.1' corresponds to the index in js it would be review[1]
    { $match:
      { 'reviews.1': { $exists: true } }
    },
    // 3 - Add the average review field
    // it will create a new field -> averageRating
    // this field will contain the calculated average of the ratings
    { $set:
      { averageRating: { $avg: '$reviews.rating' } }
    },
    // 4 - Sort it by the new field, highest review first
    // -1 sorts by descending order
    { $sort:
      { 'averageRating': -1 }
    },
    // 5 - Limit to at most 10
    { $limit: 10 }
  ]);
};

// find reviews where the spots _id property === reviews spot property
spotSchema.virtual('reviews', {
  ref: 'Review', // what model to link ?
  localField: '_id', // which field on the spot ?
  foreignField: 'spot' // which field on the review ?
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

spotSchema.pre('find', autopopulate);
spotSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Spot', spotSchema);
