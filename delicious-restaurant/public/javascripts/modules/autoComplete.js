function autocomplete(input,latInput, lngInput) {
  if(!input) return; //skip from running if there isnt any input
  const dropDown = new google.maps.places.Autocomplete(input);

  dropDown.addListener('place_changed', () =>{
    const place = dropDown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });
  // if someone presses enter on the form, it will prevent it from submitting
  input.on('keydown', event => {
    if (event.keyCode === 13) event.preventDefault();
  });
}

export default autocomplete;
