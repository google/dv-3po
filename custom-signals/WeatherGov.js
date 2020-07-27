WIND_DIRECTION_MAP = {
  'NNE': {'f': 11.25, 't': 33.75},
  'NE': {'f': 33.75, 't': 56.25},
  'ENE': {'f': 56.25, 't': 78.75},
  'E': {'f': 78.75, 't': 101.25},
  'ESE': {'f': 101.25, 't': 123.75},
  'SE': {'f': 123.75, 't': 146.25},
  'SSE': {'f': 146.25, 't': 168.75},
  'S': {'f': 168.75, 't': 191.25},
  'SSW': {'f': 191.25, 't': 213.75},
  'SW': {'f': 213.75, 't': 236.25},
  'WSW': {'f': 236.25, 't': 258.75},
  'W': {'f': 258.75, 't': 281.25},
  'WNW': {'f': 281.25, 't': 303.75},
  'NW': {'f': 303.75, 't': 326.25},
  'NNW': {'f': 326.25, 't': 348.75}
};

var WeatherGov = function(sheetName) {
  var sheetDAO = new SheetDAO();

  function latestObservationUrl(stationId) {
    return 'https://api.weather.gov/stations/' + stationId +
        '/observations/latest';
  }

  function mToInch(value) {
    if(value) {
      return value / 39.37;
    }

    return 0;
  }

  function mToMile(value) {
    if(value) {
      return value / 1609;
    }

    return 0;
  }

  function msToMph(value) {
    if (value) {
      return value * 2.237;
    }

    return 0;
  }

  function degreesToCompass(value) {
    if (value || value === 0) {
      if ((value >= 348.75 && value <= 360) || (value >= 0 && value <= 11.25)) {
        return 'N';
      } else {
        var keys = Object.getOwnPropertyNames(WIND_DIRECTION_MAP);

        for (var i = 0; i < keys.length; i++) {
          var direction = keys[i];

          if (value >= WIND_DIRECTION_MAP[direction]['f'] &&
              value <= WIND_DIRECTION_MAP[direction]['t']) {
            return direction;
          }
        }
      }
    }

    return null;
  }

  function getLatestObservation(stationId, retries, wait) {
    if (!retries) {
      retries = 5;
    }

    if (!wait) {
      wait = 2;
    }

    var httpOptions = {method: 'get', muteHttpExceptions: true}

    var response =
        UrlFetchApp.fetch(latestObservationUrl(stationId), httpOptions);

    if (response.getResponseCode() != 200) {
      if (retries > 0) {
        Utilities.sleep(wait * 1000);
        return getLatestObservation(stationId, retries - 1, wait * 2);
      } else {
        throw 'Error fetching: ' + JSON.stringify(response);
      }
    }

    return JSON.parse(response.getContentText());
  }

  function cToF(temperature) {
    if (temperature) {
      return (temperature * 9 / 5) + 32
    }

    return null;
  }


  this.refresh = function() {
    var feed = sheetDAO.sheetToDict(sheetName);
    var now = new Date();

    for (var i = 0; i < feed.length; i++) {
      var feedItem = feed[i];

      var latestObservation = getLatestObservation(feedItem['Station ID']);

      feedItem['Date'] = now;
      feedItem['Temperature (F)'] =
          cToF(latestObservation.properties.temperature.value);
      feedItem['Wind Chill'] =
          cToF(latestObservation.properties.windChill.value);
      feedItem['Heat Index'] =
          cToF(latestObservation.properties.heatIndex.value);
      feedItem['Wind Direction'] =
          degreesToCompass(latestObservation.properties.windDirection.value);
      feedItem['Wind Speed (mph)'] =
          msToMph(latestObservation.properties.windSpeed.value);
      feedItem['Visibility (miles)'] =
          mToMile(latestObservation.properties.visibility.value);
      feedItem['Relative Humidity (%)'] =
          latestObservation.properties.relativeHumidity.value;
      feedItem['Precipitation Last 6 Hours (in)'] =
          mToInch(latestObservation.properties.precipitationLast3Hours.value);
      feedItem['Source'] =
          'weather.gov';
    }

    sheetDAO.clear('Weather', 'A2:AZ');
    sheetDAO.dictToSheet('Weather', feed);
  }
}
