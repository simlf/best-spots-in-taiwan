const mongoose = require('mongoose');
const Spot = mongoose.model('Spot');
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
  console.log(req.body);
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
  // Query DB for a list of all spots
  const spots = await Spot.find();
  res.render('spots', { title: 'Spots', spots });
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
  const spot = await Spot.findOne({ slug: req.params.slug }).populate('author');
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
