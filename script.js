const apiKey = '3dba6032f45fd5dd872df89e970aadd8';
const weatherApiUrl = 'https://api.openweathermap.org/data/2.5/weather';
const forecastApiUrl = 'https://api.openweathermap.org/data/2.5/forecast';

let map = null;
let marker = null;
let savedLocations = [];

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const cityName = document.getElementById('city');
const date = document.getElementById('date');
const locationsList = document.getElementById('locations-list');
const currentLocationBtn = document.getElementById('current-location');
const clearLocationsBtn = document.getElementById('clear-locations');
const forecastContainer = document.getElementById('forecast-container');

// Initialize Leaflet Map
function initMap() {
    try {
        if (!map) {
            map = L.map('map').setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ' OpenStreetMap contributors'
            }).addTo(map);
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Update date
function updateDate() {
    const now = new Date();
    date.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format date for forecast
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
}

// Fetch weather data
async function getWeather(city) {
    try {
        const response = await fetch(`${weatherApiUrl}?q=${city}&appid=${apiKey}&units=metric`);
        if (!response.ok) {
            throw new Error('City not found');
        }
        const data = await response.json();
        updateWeatherUI(data);
        updateMap(data.coord.lat, data.coord.lon, city);
        getForecast(data.coord.lat, data.coord.lon);
        return data;
    } catch (error) {
        alert(error.message);
        return null;
    }
}

// Fetch forecast data
async function getForecast(lat, lon) {
    try {
        const response = await fetch(
            `${forecastApiUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=40`
        );
        if (!response.ok) {
            throw new Error('Forecast data not available');
        }
        const data = await response.json();
        updateForecastUI(data.list);
    } catch (error) {
        console.error('Error fetching forecast:', error);
    }
}

// Update UI with weather data
function updateWeatherUI(data) {
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind.speed} km/h`;
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    updateDate();
}

// Update forecast UI
function updateForecastUI(forecastData) {
    forecastContainer.innerHTML = '';
    
    // Get one forecast per day (excluding today)
    const dailyForecasts = forecastData.reduce((acc, forecast) => {
        const forecastDate = new Date(forecast.dt * 1000).toLocaleDateString();
        if (!acc[forecastDate]) {
            acc[forecastDate] = forecast;
        }
        return acc;
    }, {});

    // Convert to array and take first 7 days
    Object.values(dailyForecasts)
        .slice(1, 8)
        .forEach(forecast => {
            const { day, date: forecastDate } = formatDate(forecast.dt);
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="day">${day}</div>
                <div class="date">${forecastDate}</div>
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" 
                     alt="${forecast.weather[0].description}">
                <div class="temp">${Math.round(forecast.main.temp)}°C</div>
                <div class="temp-range">
                    ${Math.round(forecast.main.temp_min)}° / ${Math.round(forecast.main.temp_max)}°
                </div>
                <div class="description">${forecast.weather[0].description}</div>
            `;
            forecastContainer.appendChild(card);
        });
}

// Update map location
function updateMap(lat, lon, cityName) {
    try {
        if (map) {
            map.setView([lat, lon], 13);
            if (marker) {
                map.removeLayer(marker);
            }
            marker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup(cityName)
                .openPopup();
            map.invalidateSize();
        }
    } catch (error) {
        console.error('Error updating map:', error);
    }
}

// Save location
function saveLocation(data) {
    if (!data) return;
    
    const locationExists = savedLocations.some(loc => loc.name === data.name);
    if (!locationExists) {
        const location = {
            name: data.name,
            country: data.sys.country,
            coord: data.coord
        };
        savedLocations.push(location);
        updateSavedLocationsUI();
        localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    }
}

// Update saved locations UI
function updateSavedLocationsUI() {
    locationsList.innerHTML = '';
    if (savedLocations.length === 0) {
        locationsList.innerHTML = '<div class="no-locations">No saved locations</div>';
        return;
    }
    
    savedLocations.forEach(location => {
        const locationItem = document.createElement('div');
        locationItem.className = 'location-item';
        
        const locationName = document.createElement('span');
        locationName.textContent = `${location.name}, ${location.country}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeLocation(location.name);
        });
        
        locationItem.appendChild(locationName);
        locationItem.appendChild(deleteBtn);
        
        locationItem.addEventListener('click', () => {
            getWeather(location.name);
        });
        
        locationsList.appendChild(locationItem);
    });
}

// Remove location
function removeLocation(locationName) {
    savedLocations = savedLocations.filter(loc => loc.name !== locationName);
    updateSavedLocationsUI();
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
}

// Clear all locations
function clearLocations() {
    savedLocations = [];
    updateSavedLocationsUI();
    localStorage.removeItem('savedLocations');
}

// Load saved locations from localStorage
function loadSavedLocations() {
    const saved = localStorage.getItem('savedLocations');
    if (saved) {
        savedLocations = JSON.parse(saved);
        updateSavedLocationsUI();
    }
}

// Event listeners
searchBtn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
    if (city) {
        const data = await getWeather(city);
        if (data) {
            saveLocation(data);
            cityInput.value = '';
        }
    }
});

cityInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            const data = await getWeather(city);
            if (data) {
                saveLocation(data);
                cityInput.value = '';
            }
        }
    }
});

currentLocationBtn.addEventListener('click', getCurrentLocation);
clearLocationsBtn.addEventListener('click', clearLocations);

// Get user's current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const response = await fetch(
                    `${weatherApiUrl}?lat=${position.coords.latitude}&lon=${position.coords.longitude}&appid=${apiKey}&units=metric`
                );
                const data = await response.json();
                updateWeatherUI(data);
                updateMap(position.coords.latitude, position.coords.longitude, data.name);
                getForecast(position.coords.latitude, position.coords.longitude);
                saveLocation(data);
            },
            (error) => {
                console.error('Error getting location:', error);
                getWeather('London'); // Default to London
            }
        );
    } else {
        getWeather('London'); // Default to London
    }
}

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadSavedLocations();
    getCurrentLocation();
});
