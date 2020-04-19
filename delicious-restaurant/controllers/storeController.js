const mongoose = require('mongoose');
const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  res.render('index', {title: 'Home'});
};

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'});
}

exports.createStore = (req, res) => {
  const Store = new Store(req.body);
  store.save();
}
