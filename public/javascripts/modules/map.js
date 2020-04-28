import axios from 'axios'; // library for XMLHTTP and http requests
import { $ } from './bling';
const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios.get(`/api/spots/near?lat=${lat}&lng=${lng}`)
    .then(response => {
      // skip it if there isnt any place found
      const places = response.data;
      if (!places.length) {
        alert('No places found');
        return;
      }

      // create bounds (like a circle all around the markers)
      const bounds = new google.maps.LatLngBounds();

      // create an info window (in order to do something when a marker is clicked)
      const infoWindow = new google.maps.InfoWindow();

      // create the markers
      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({ map, position });
        marker.place = place;
        return marker;
      });

      // when a marker is clicked ==> show info about the spot
      // addListener is the special syntax for Google Maps
      markers.forEach(marker => marker.addListener('click', function() {
          const html = `
          <div class="popup">
            <a href="/spot/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'spot.png'}" alt="${this.place.name}" />
            <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
          `;
          infoWindow.setContent(html);
          infoWindow.open(map, this); // will open a infoWindow on the map, above the marker
      }));
      // zoom the map to fit all the markers
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) return;

  // make our owm map
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  });
}

export default makeMap;

