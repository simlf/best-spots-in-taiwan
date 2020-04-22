const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
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
  photo: String
});

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);

  // Find if there are already Stores with the same slug
  const slugRegEx = new RegExp (`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx});
  // If there is already stores with the same slug, then this Store slug should be different
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length - 1}`;
  }

  next();
});

module.exports = mongoose.model('Store', storeSchema);
