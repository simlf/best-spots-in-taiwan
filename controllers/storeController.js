const mongoose = require('mongoose');
const Store = mongoose.model('Store');
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
      next({message: 'That file type isn\'t allowed'}, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index', {title: 'Home'});
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo'); // uploaded to our filesystem but not saved yet in the DB

exports.resize = async (req, res, next) => {
  if (!req.file) {
    next();  // skip it if there is no new file to resize
    return;
  };

  // Rename the photo with a unique ID (uuid)
  // then send it to the body request with it's mimetype extention (we don't trust the users extension)
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`

  // Resize the photo
  const photo = await jimp.read(req.file.buffer); // buffer is an area of memory where the photo is stored as a raw binary data
  await photo.resize(800, jimp.AUTO); // width of 800 and automatic height
  await photo.write(`./public/uploads/${req.body.photo}`); // writes the photo to our filesystem

  // Go the next function
  next();
};

// You should use async every you are dealing with the DB
exports.createStore = async (req, res) => {
  const store = await (new Store(req.body)).save();
  req.flash('success', `${store.name} was succesfully created!`)
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res)  => {
  // Query DB for a list of all stores
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores });
};

exports.editStore = async (req, res) => {
  // Find the store by its ID
  const store = await Store.findOne({_id: req.params.id});

  // Check if the user is the owner
  // LATER

  // Render out the edit form
  res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // Find the store store and update it
  // findOneAndUpdate() is a method in MongoDB
  // it takes three parameters : query, data, options

  req.body.location.type = 'Point';// set the location data to be a Point
  const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
      new: true, // return the new store instead of the former one
      runValidators: true, // run all the required validators from the models
  }).exec();

  // Redirect to the store and flash that it worked
  req.flash('success', `<strong>${store.name}</strong> was succesfully updated. <a href='/stores/${store.slug}'> View Store -> </a>`);
  res.redirect(`/stores/${store.id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  // Find the store in the DB
  const store = await Store.findOne({ slug: req.params.slug });
  if (!store) return next();
  // Render the page
  res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag
  const tagQuery = tag || { $exists: true }
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', { tags, title: 'Tags', stores, tag });
}
