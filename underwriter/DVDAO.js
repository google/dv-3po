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

/**
 * DVDAO provides high level access to the DV360 API
 */
var DVDAO = function() {

  const BASE_API_URL = "https://displayvideo.googleapis.com/v1";
  const CONTENT_API_URL = "https://displayvideo.googleapis.com/download/";

  function apiCall(urlSuffix, options) {
    var url = BASE_API_URL + urlSuffix;

    if(!options) {
      options = {};
    }

    if(!options.headers) {
      options.headers = {};
    }

    // For testing only
    options.muteHttpExceptions = true;
    // ----

    options.headers['Authorization'] = "Bearer " + ScriptApp.getOAuthToken();
    options.headers['Content-Type'] = "application/json";

    var response = UrlFetchApp.fetch(url, options);

    if(response.getResponseCode() != 200) {
      throw "Error fetching report " + response.getContentText();
    }

    return JSON.parse(response.getContentText());
  }

  this.getLineItem = function(advertiserId, lineItemId) {
    return apiCall("/advertisers/" + advertiserId + "/lineItems/" + lineItemId);
  }

  this.listInsertionOrders = function(advertiserId, filter, pageToken) {
    var endpoint = "/advertisers/" + advertiserId + "/insertionOrders/";
    var separator = "?";

    if(filter) {
      endpoint += separator + "filter=" + filter;

      separator = '&';
    }

    if(pageToken) {
      endpoint += separator + 'pageToken=' + pageToken;
    }

    return apiCall(endpoint);
  }

  this.createSDFDownloadTask = function(advertiserId, idFilter) {
    var endpoint = "/sdfdownloadtasks/";

    return apiCall(endpoint, {
      "method": "post",
      "payload": JSON.stringify(
        {
          "version": "SDF_VERSION_5_2",
          "advertiserId": advertiserId,
          "idFilter": idFilter
        }
      )
    });
  }

  this.getSDFDownloadTask = function(task) {
    var endpoint = "/" + task.name;

    return apiCall(endpoint);
  }

  this.downloadSDF = function(task) {
    //var endpoint = "/" + task.response.resourceName;
    var endpoint = task.response.resourceName + "?alt=media";

    var url =  CONTENT_API_URL + endpoint;

    var options = {
      'headers': {
        'accept': 'application/zip'
      }
    };

    // For testing only
    options.muteHttpExceptions = true;
    // ----

    options.headers['Authorization'] = "Bearer " + ScriptApp.getOAuthToken();

    var response = UrlFetchApp.fetch(url, options);

    if(response.getResponseCode() != 200) {
      throw "Error fetching report " + response.getContentText();
    }

    var content = response.getBlob();

    content.setContentType('application/zip');

    return Utilities.unzip(content);
  }

}

var dvDAO;
function getDVDAO() {
  if(!dvDAO) {
    dvDAO = new DVDAO();
  }

  return dvDAO;
}
