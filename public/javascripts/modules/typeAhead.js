const axios = require('axios');

function searchResultsHTML(spots) {
  return spots.map(spot => {
    return `
    <a href='/spot/${spot.slug}' class='search__result'>
      <strong>${spot.name}</name>
    </a>
    `;
    }).join(' ');
};

function typeAhead(search) {
  if (!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    // if there isn't any value, return
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    // show the search results
    searchResults.style.display = 'block';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          searchResults.innerHTML = searchResultsHTML(res.data);
        }
      });
  });
};

export default typeAhead;
