const mongoose = require('mongoose');
const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  res.render('index', {title: 'Home'});
};

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'});
}

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
}

exports.editStore = async (req, res) => {
  // Find the store by its ID
  const store = await Store.findOne({_id: req.params.id});
  // Check if the user is the owner
  // LATER

  // Render out the edit form
  res.render('editStore', { title: `Edit ${store.name}`, store });
}

exports.updateStore = async (req, res) => {
  // Find the store store and update it
  // findOneAndUpdate() is a method in MongoDB
  // it takes three parameters : query, data, options
  const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
      new: true, // return the new store instead of the former one
      runValidators: true, // run all the required validators from the models
  }).exec();

  // Redirect to the store and flash that it worked
  req.flash('success', `<strong>${store.name}</strong> was succesfully updated. <a href='/stores/${store.slug}'> View Store -> </a>`);
  res.redirect(`/stores/${store.id}/edit`);
}
