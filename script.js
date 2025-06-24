'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const buttonsContainer = document.querySelector('.workouts');
const navButtons = document.querySelector('.nav-buttons');
const modal = document.querySelector('.modal');
const overaly = document.querySelector('.overlay');
const btnCancel = document.querySelector('.btn--cancel');
const btnAccept = document.querySelector('.btn--accept');
//////////////////////////////////////////
//////////// APPLICATION Architecteur
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  #route;
  #markers = new Map();
  constructor() {
    // Get user position
    this._getPosition();
    // Get data from localStorage
    this._getLocalStorage();
    // attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    buttonsContainer.addEventListener(
      'click',
      this._workoutControle.bind(this)
    );
    navButtons.addEventListener('click', this._buttonsNav.bind(this));
    this.hideNavButton();
  }

  _getPosition() {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          this._loadMap.bind(this),
          err =>
            this._showModal('err', '', {
              title: 'Location Error',
              description: `Could not get your location. Error: ${err.message}`,
            })
        );
      } else if (result.state === 'prompt') {
        this._showModal('authLocalisation', '', {
          title: 'Location Permission Required',
          description:
            'Please allow location access to continue using the app.',
        });
      } else {
        this._showModal('err', '', {
          title: 'Location Permission Denied',
          description:
            'You have denied location access. Please enable it from browser settings.',
        });
      }
    });
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('Current position .')
      .openPopup();

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMaker(work);
    });
  }

  _showForm(mapEv) {
    this.#mapEvent = mapEv;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField(input) {
    if (input === 'running') {
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
    } else if (input === 'cycling') {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
    } else {
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
    }
  }

  _newWorkout(e) {
    // check if data is valid
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // block event submit form
    e.preventDefault();
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if activity running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._showModal('err', '', {
          title: 'Please enter all information in form!',
          description: 'to Add new Workout need all data in form to calculate.',
        });

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if activity cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert('Inputs have to be positive Numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new object to workout array
    this.#workouts.push(workout);
    //render workout on map as marker
    this._renderWorkoutMaker(workout);

    // render workout on list
    this._renderWorkout(workout);
    // hide form + clear input fields
    this._hideForm();
    // set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMaker(workout) {
    const marker = L.marker(workout.coords)
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
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup();
    this.#markers.set(workout.id, marker);
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
         <div class="workout--head">
            <h2 class="workout__title">${
              workout.type === 'running' ? 'Running' : 'Cycling'
            } on April 14</h2>
            <div class="workout--buttons">
                 <button class="btn btn--save workout-btn--save hidden">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>

              </button>
              <button class="btn btn--edit workout-btn--edit">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
              <button class="btn btn--delete workout-btn--delete">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴'
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
    if (workout.type === 'running') {
      html += `
           <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    } else if (workout.type === 'cycling') {
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _hideForm() {
    this._clearInputs();
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(wr => wr.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using the public interface
    workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data.map(obj => {
      let workout;
      if (obj.type === 'running') {
        workout = new Running(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.cadence
        );
      } else if (obj.type === 'cycling') {
        workout = new Cycling(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.elevationGain
        );
      }
      workout.date = new Date(obj.date);
      workout.id = obj.id;
      return workout;
    });
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  _clearInputs() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
  }
  _workoutControle(e) {
    const buttonEl = e.target.closest('.btn');
    if (!buttonEl) return;
    const workoutEl = e.target.closest('.workout');
    const id = workoutEl.dataset.id;

    if (buttonEl.classList.contains('workout-btn--edit')) {
      this._editWorkwout(workoutEl, id);
    }
    if (buttonEl.classList.contains('workout-btn--delete')) {
      console.log(workoutEl);
      this._showModal('delete', workoutEl, {
        title: 'Are you sure?',
        description: `"Are you sure you want to remove this item?.${
          workoutEl.querySelector('.workout__title').textContent
        }`,
      });
    }
  }
  _editWorkwout(workoutEl, id) {
    const we = this.#workouts.find(w => w.id === id);
    const btnEdit = workoutEl.querySelector('.workout-btn--edit');
    const saveBtn = workoutEl.querySelector('.btn--save');
    const newSaveHandler = function () {
      // change buttons
      we.type = inputType.value;
      we.duration = inputDuration.value;
      we.distance = inputDistance.value;
      we._setDescription();
      if (we.type === 'running') {
        we.cadence = inputCadence.value;
        we.calcPace();
      } else if (we.type === 'cycling') {
        we.elevationGain = inputElevation.value;
        we.calcSpeed();
      }
      // change button
      saveBtn.classList.add('hidden');
      btnEdit.classList.remove('hidden');

      // hidden form again
      form.classList.add('hidden');
      // reload UX
      //remove old one
      workoutEl.remove();
      //create new onr
      this._renderWorkout(we);
      // save it in local Storage
      this._setLocalStorage();
      // clear input fields
      this._clearInputs();
      //remove old events
      saveBtn.removeEventListener('click', newSaveHandler);
    };
    this._showForm();
    this._toggleElevationField(we.type);
    // add value to input
    inputDistance.value = we.distance;
    inputDuration.value = we.duration;
    inputType.value = we.type;
    // check type of workout
    if (we.type === 'running') {
      inputCadence.value = we.cadence;
    } else if (we.type === 'cycling') {
      inputElevation.value = we.elevationGain;
    }
    // change buttons
    btnEdit?.classList.add('hidden');
    saveBtn?.classList.remove('hidden');
    saveBtn.removeEventListener('click', newSaveHandler);
    saveBtn.addEventListener('click', newSaveHandler.bind(this));
  }
  _deleteWorkout(workoutEl) {
    const id = workoutEl.dataset.id;
    if (!workoutEl.querySelector('.btn')) return;
    const marker = this.#markers.get(id);
    if (marker) {
      this.#map.removeLayer(marker);
      this.#markers.delete(id);
    }
    const workouts = this.#workouts.filter(we => we.id != id);
    // update array with filter
    this.#workouts = workouts;
    // update UX
    workoutEl.remove();
    // update localStorage
    this._setLocalStorage();
  }
  _buttonsNav(e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    if (btn.classList.contains('btn--reset')) {
      this._showModal('reset', '', {
        title: 'Are you sure to do this?',
        description: 'this well be remove all history of activity..',
      });
    } else if (btn.classList.contains('btn--sort')) this._sortWorkouts();
    else if (btn.classList.contains('btn--showAll')) this._showAllWorkouts();
    else if (btn.classList.contains('btn--showLines')) this._fitRouteOnMap();
  }
  _sortWorkouts() {
    let isSorted = containerWorkouts.classList.contains('sorted');

    // sort array of workout to desc
    this.#workouts = this.#workouts = [...this.#workouts].sort((a, b) =>
      isSorted ? a.date - b.date : b.date - a.date
    );
    // remove all old items
    containerWorkouts.querySelectorAll('.workout').forEach(el => el.remove());
    // render new items
    this.#workouts.forEach(w => this._renderWorkout(w));
    // add class sorted
    containerWorkouts.classList.toggle('sorted');
  }
  _showModal(type = ' ', data, options) {
    const title = document.querySelector('.heading-modal');
    const des = document.querySelector('.modal-para');
    title.textContent = options?.title;
    des.textContent = options?.description;
    const handler = () => {
      switch (type) {
        case 'reset': {
          this.reset();
          break;
        }
        case 'delete': {
          this._deleteWorkout(data);
          break;
        }
        case 'authLocalisation': {
          navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this),
            err => {
              this._showModal('err', '', {
                title: 'Location Error',
                description: `Could not get your location. Error: ${err.message}`,
              });
            }
          );
          break;
        }
        case 'err': {
          this.hideModal();
          break;
        }
        default:
          console.warn('No action matched');
      }
      btnAccept.removeEventListener('click', handler);
      this.hideModal();
    };
    btnAccept.addEventListener('click', handler);

    modal.classList.remove('hidden');
    overaly.classList.remove('hidden');
  }
  _showAllWorkouts() {
    if (this.#workouts.length === 0) return;
    const bounds = this.#workouts.map(w => w.coords);
    this.#map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }
  _fitRouteOnMap() {
    if (this.#workouts.length < 2) return;
    const coords = this.#workouts.map(w => w.coords);
    if (this.#route) this.#map.removeLayer(this.#route);
    this.#route = L.polyline(coords, {
      color: '#e63946',
      weight: 4,
      opacity: 0.8,
    }).addTo(this.#map);
    this.#map.fitBounds(this.#route.getBounds(), { padding: [50, 50] });
  }
  hideModal() {
    modal.classList.add('hidden');
    overaly.classList.add('hidden');
  }
  hideNavButton() {
    this.#workouts.length > 2
      ? navButtons.classList.remove('hidden')
      : navButtons.classList.add('hidden');
  }
}
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    // this.date = date
    this.coords = coords; //[lat, lng]
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
  click() {
    this.clicks++;
  }
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

const app = new App();
overaly.addEventListener('click', app.hideModal);
btnCancel.addEventListener('click', app.hideModal);

const navIner = setInterval(() => {
  console.log('interval');
  if (navButtons.classList.contains('hidden')) app.hideNavButton();
  else clearInterval(navIner);
}, 3000);
