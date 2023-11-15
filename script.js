'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10) + String(Math.floor(Math.random() * 100));
  // clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  // }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let btnId;
let btnIndx;
const idArray = [];

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    //Position map
    this._positionMap();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map', {
      center: [latitude, longitude],
      zoom: this.#mapZoomLevel,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    const lyrOSM = L.tileLayer.provider('OpenStreetMap.Mapnik');
    const lyrImagery = L.tileLayer.provider('Esri.WorldImagery');
    const lyrTopo = L.tileLayer.provider('OpenTopoMap');
    const objOverlays = {};

    const objBasemaps = {
      'Open Street Maps': lyrOSM,
      Imagery: lyrImagery,
      'Topo Map': lyrTopo,
    };

    const options = {
      position: 'topleft', // Position to show the control. Values: 'topright', 'topleft', 'bottomright', 'bottomleft'
      unit: 'kilometres', // Default unit the distances are displayed in. Values: 'kilometres', 'landmiles', 'nauticalmiles'
      useSubunits: true, // Use subunits (metres/feet) in tooltips if distances are less than 1 kilometre/landmile
      clearMeasurementsOnStop: false, // Clear all measurements when Measure Control is switched off
      showBearings: false, // Whether bearings are displayed within the tooltips
      bearingTextIn: 'In', // language dependend label for inbound bearings
      bearingTextOut: 'Out', // language dependend label for outbound bearings
      tooltipTextFinish: 'Click to <b>finish line</b><br>',
      tooltipTextDelete: 'Press SHIFT-key and click to <b>delete point</b>',
      tooltipTextMove: 'Click and drag to <b>move point</b><br>',
      tooltipTextResume: '<br>Press CTRL-key and click to <b>resume line</b>',
      tooltipTextAdd: 'Press CTRL-key and click to <b>add point</b>',
      // language dependend labels for point's tooltips
      measureControlTitleOn: 'Turn on PolylineMeasure', // Title for the Measure Control going to be switched on
      measureControlTitleOff: 'Turn off PolylineMeasure', // Title for the Measure Control going to be switched off
      measureControlLabel: '&#8614;', // Label of the Measure Control (Unicode symbols are possible)
      measureControlClasses: [], // Classes to apply to the Measure Control
      showClearControl: true, // Show a control to clear all the measurements
      clearControlTitle: 'Clear Measurements', // Title text to show on the Clear Control
      clearControlLabel: '&times', // Label of the Clear Control (Unicode symbols are possible)
      clearControlClasses: [], // Classes to apply to Clear Control
      showUnitControl: true, // Show a control to change the units of measurements
      unitControlUnits: ['kilometres', 'landmiles', 'nauticalmiles'],
      // measurement units being cycled through by using the Unit Control
      unitControlTitle: {
        // Title texts to show on the Unit Control
        text: 'Change Units',
        kilometres: 'kilometres',
        landmiles: 'land miles',
        nauticalmiles: 'nautical miles',
      },
      unitControlLabel: {
        // Unit symbols to show in the Unit Control and measurement labels
        metres: 'm',
        kilometres: 'km',
        feet: 'ft',
        landmiles: 'mi',
        nauticalmiles: 'nm',
      },
      unitControlClasses: [], // Classes to apply to the Unit Control
      tempLine: {
        // Styling settings for the temporary dashed line
        color: '#00f', // Dashed line color
        weight: 2, // Dashed line weight
      },
      fixedLine: {
        // Styling for the solid line
        color: '#006', // Solid line color
        weight: 2, // Solid line weight
      },
      arrow: {
        // Styling of the midway arrow
        color: '#000', // Color of the arrow
      },
      startCircle: {
        // Style settings for circle marker indicating the starting point of the polyline
        color: '#000', // Color of the border of the circle
        weight: 1, // Weight of the circle
        fillColor: '#0f0', // Fill color of the circle
        fillOpacity: 1, // Fill opacity of the circle
        radius: 3, // Radius of the circle
      },
      intermedCircle: {
        // Style settings for all circle markers between startCircle and endCircle
        color: '#000', // Color of the border of the circle
        weight: 1, // Weight of the circle
        fillColor: '#ff0', // Fill color of the circle
        fillOpacity: 1, // Fill opacity of the circle
        radius: 3, // Radius of the circle
      },
      currentCircle: {
        // Style settings for circle marker indicating the latest point of the polyline during drawing a line
        color: '#000', // Color of the border of the circle
        weight: 1, // Weight of the circle
        fillColor: '#f0f', // Fill color of the circle
        fillOpacity: 1, // Fill opacity of the circle
        radius: 6, // Radius of the circle
      },
      endCircle: {
        // Style settings for circle marker indicating the last point of the polyline
        color: '#000', // Color of the border of the circle
        weight: 1, // Weight of the circle
        fillColor: '#f00', // Fill color of the circle
        fillOpacity: 1, // Fill opacity of the circle
        radius: 3, // Radius of the circle
      },
    };
    L.control.polylineMeasure(options).addTo(this.#map);
    L.control.layers(objBasemaps, objOverlays).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.#map.on('click', function (e) {
      console.log(e.latlng.toString());
    });

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });

    if (this.#workouts) {
      console.log(`in _positionMap() and workouts array is ${this.#workouts}`);
      const pntCoords = [];
      this.#workouts.forEach(function (work) {
        console.log(work.coords);
        pntCoords.push(work.coords);
      });
      console.log(pntCoords);
      let polygon = L.polygon(pntCoords, {
        color: 'red',
        opacity: 0,
        fillOpacity: 0,
      }).addTo(this.#map);
      this.#map.fitBounds(polygon.getBounds());
    }
  }

  _positionMap() {}

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class = "workout__heading__container">
          <h2 class="workout__title">${workout.description}</h2>
          <button class = "workout__del-btn" data-btnid="btn-${
            workout.id
          }">X</button>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    form.insertAdjacentHTML('afterend', html);
    let workoutDelBtn = document.querySelector('.workout__del-btn');
    idArray.push(workoutDelBtn.dataset.btnid.slice(4));
    console.log(idArray);
    let workoutsArray = this.#workouts;
    console.log(workoutsArray);
    workoutDelBtn.addEventListener('click', function () {
      console.log(this.dataset.btnid);
      btnId = this.dataset.btnid.slice(4);
      btnIndx = idArray.indexOf(btnId);
      workoutsArray.splice(btnIndx, 1);
      console.log(workoutsArray);
      localStorage.clear();
      localStorage.setItem('workouts', JSON.stringify(workoutsArray));
      location.reload();
    });
  }

  _moveToPopup(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    const newWorkouts = [];
    let newWorkOut;
    this.#workouts = data;

    this.#workouts.forEach(function (work) {
      if (work.type === 'running') {
        newWorkOut = new Running(
          work.coords,
          work.distance,
          work.duration,
          work.cadence
        );
        newWorkouts.push(newWorkOut);
      } else {
        newWorkOut = new Cycling(
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain
        );
        newWorkouts.push(newWorkOut);
      }
    });
    this.#workouts = [];
    this.#workouts = newWorkouts;
    this.#workouts.forEach(work => {
      console.log('rendering workout');
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
