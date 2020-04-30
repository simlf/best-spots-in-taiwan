const mongoose = require('mongoose');
const Spot = mongoose.model('Spot');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    // Check that the user uploads an image (not something else)
    // The mimetype gives the type of the file and its extension
    // Example :
    // mimetype: 'image/jpeg'
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index', {title: 'Home'});
};

exports.addSpot = (req, res) => {
  res.render('editSpot', { title: 'Add Spot' });
};

exports.upload = multer(multerOptions).single('photo'); // uploaded to our filesystem but not saved yet in the DB

exports.resize = async (req, res, next) => {
  if (!req.file) {
    next();  // skip it if there is no new file to resize
    return;
  }

  // Rename the photo with a unique ID (uuid)
  // then send it to the body request with it's mimetype extention (we don't trust the users extension)
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  // Resize the photo
  const photo = await jimp.read(req.file.buffer); // buffer is an area of memory where the photo is stored as a raw binary data
  await photo.resize(800, jimp.AUTO); // width of 800 and automatic height
  await photo.write(`./public/uploads/${req.body.photo}`); // writes the photo to our filesystem

  // Go the next function
  next();
};

// You should use async every you are dealing with the DB
exports.createSpot = async (req, res) => {
  console.log(req.body._id);
  req.body.author = req.user._id;
  const spot = await (new Spot(req.body)).save();
  req.flash('success', `${spot.name} was succesfully created!`)
  res.redirect(`/spot/${spot.slug}`);
};

exports.getSpots = async (req, res)  => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;

  // Query DB for a list of all spots and paginate (for performance reasons)
  const spotsPromise = Spot
  .find()
  .skip(skip)
  .limit(limit)
  .populate('reviews');

  const countPromise = Spot.count();
  // the two queries spotsPromise anf countPromise will be done at the same time but wait for both of them to come back
  const [spots, count] = await Promise.all([spotsPromise, countPromise]);
  const pages = Math.ceil(count / limit); // Math.ceil() will round the result up to next number

  // redirect to the last page if they request a page that doesnt exists
  if (!spots.length && skip) {
    req.flash('info', `You asked for page ${page}, that doesn't exists, you are redirected to page ${pages}`);
    res.redirect(`/spots/page/${pages}`);
    return;
  }
  res.render('spots', { title: 'Spots', spots, pages, page, count });
};

const confirmOwner = (spot, user) => {
  if (!spot.author.equals(user._id)) {
    throw Error('You must have added the spot in order to edit it');
  }
};

exports.editSpot = async (req, res) => {
  // Find the spot by its ID
  const spot = await Spot.findOne({_id: req.params.id});

  // Check if the user is the owner
  confirmOwner(spot, req.user);

  // Render out the edit form
  res.render('editSpot', { title: `Edit ${spot.name}`, spot });
};

exports.updateSpot = async (req, res) => {
  // Find the spot and update it
  // findOneAndUpdate() is a method in MongoDB
  // it takes three parameters : query, data, options

  req.body.location.type = 'Point';// set the location data to be a Point
  const spot = await Spot.findOneAndUpdate({_id: req.params.id}, req.body, {
      new: true, // return the new spot instead of the former one
      runValidators: true, // run all the required validators from the models
  }).exec();

  // Redirect to the spot and flash that it worked
  req.flash('success', `<strong>${spot.name}</strong> was succesfully updated. <a href='/spot/${spot.slug}'> View Spot -> </a>`);
  res.redirect(`/spots/${spot.id}/edit`);
};

exports.getSpotBySlug = async (req, res, next) => {
  // Find the spot in the DB
  const spot = await Spot.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!spot) return next();
  // Render the page
  res.render('spot', { spot, title: spot.name });
};

exports.getSpotsByTag = async (req, res) => {
  const tag = req.params.tag
  const tagQuery = tag || { $exists: true }
  const tagsPromise = Spot.getTagsList();
  const spotsPromise = Spot.find({ tags: tagQuery });
  const [tags, spots] = await Promise.all([tagsPromise, spotsPromise]);
  res.render('tag', { tags, title: 'Tags', spots, tag });
};

//API

exports.searchSpots = async (req, res) => {
  const spots = await Spot
  // find spots that match the query
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore'}
  })
  // sort the spots by score (more accurate query)
  .sort({
    score: { $meta: 'textScore'}
  })
  // limit the 5 first results
  .limit(5);
  res.json(spots);
};

exports.mapSpots = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 80000 // 10 km
      }
    }
  };

  const spots = await Spot.find(q).select('slug name description location photo');
  res.json(spots);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartSpot = async (req, res) => {
  const hearts = req.user.hearts.map(object => object.toString());
  // if the user has a heart (corresponding to the request params), it will be removed otherwise it will be added
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
  .findByIdAndUpdate(req.user._id,
  { [operator]: { hearts: req.params.id } }, // [operator] will be replaced by either $pull or $addToSet
  { new: true } // it will show the User after it has been updated
  );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  // 1.Find all the hearts that the user has and relate them to a spot
  // 2.Link them to the spots
  const spots = await Spot.find({
    _id: { $in: req.user.hearts }
  });

  res.render('hearts', { title: 'Hearted spot', spots });
};

exports.getTopSpots = async (req, res) => {
  const spots = await Spot.getTopSpots();
  res.render('topSpots', { title: '🇹🇼 The best spots ⭐️', spots });
};
