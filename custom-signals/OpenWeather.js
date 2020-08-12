/***************************************************************************
*
*  Copyright 2020 Google Inc.
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*      https://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*
*  Note that these code samples being shared are not official Google
*  products and are not formally supported.
*
***************************************************************************/

var OpenWeather = function(sheetName) {
  var sheetDAO = new SheetDAO();
  var apiKey = null;

  function getApiKey() {
    if(!apiKey) {
      apiKey = sheetDAO.getValue("Config", "B3");
    }

    return apiKey;
  }

  function currentsByCityUrl(cityName) {
    return "http://api.openweathermap.org/data/2.5/weather?q=" +
        cityName + "&units=imperial&appid=" + getApiKey();
  }

  function getCurrentsByCity(cityName, retries, wait) {
    if (!retries) {
      retries = 5;
    }

    if (!wait) {
      wait = 2;
    }

    var httpOptions = {method: 'get', muteHttpExceptions: true}

    var response =
        UrlFetchApp.fetch(currentsByCityUrl(cityName), httpOptions);

    if (response.getResponseCode() != 200) {
      if (retries > 0) {
        Utilities.sleep(wait * 1000);
        return getCurrentsByCity(stationId, retries - 1, wait * 2);
      } else {
        throw 'Error fetching: ' + JSON.stringify(response);
      }
    }

    return JSON.parse(response.getContentText());
  }

  this.refresh = function() {
    // No API Key available, so nothing to do.
    if(!getApiKey()) {
      return;
    }

    var feed = sheetDAO.sheetToDict(sheetName);
    var now = new Date();

    for (var i = 0; i < feed.length; i++) {
      var feedItem = feed[i];

      var currents = getCurrentsByCity(feedItem['City Name']);

      feedItem['Date'] = now;
      feedItem['Temperature (F)'] = currents.main.temp;
      feedItem['Feels Like'] = currents.main.feels_like;
      feedItem['Temperature Min (F)'] = currents.main.temp_min;
      feedItem['Temperature Max (F)'] = currents.main.temp_max;
      feedItem['Pressure'] = currents.main.pressure;
      feedItem['Humidity'] = currents.main.humidity;
      feedItem['Wind Speed'] = currents.wind.speed;
      if(currents.weather && currents.weather.length > 0) {
        feedItem['Conditions'] = currents.weather[0].description;
      } else {
        feedItem['Conditions'] = '';
      }
      feedItem['Source'] =
          'OpenWeather.com';
    }

    sheetDAO.clear(sheetName, 'A2:AZ');
    sheetDAO.dictToSheet(sheetName, feed);
  }
}
