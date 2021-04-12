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

  function apiCall(urlSuffix, options) {
    var url = constants.BASE_API_URL + urlSuffix;

    if(!options) {
      options = {};
    }

    if(!options.headers) {
      options.headers = {};
    }

    // For testing only
    options.muteHttpExceptions = true;
    // ----

    options.headers[constants.AUTHORIZATION_HEADER] = "Bearer " + ScriptApp.getOAuthToken();
    options.headers[constants.CONTENT_TYPE_HEADER] = constants.CONTENT_TYPE_JSON;

    var response = UrlFetchApp.fetch(url, options);

    if(response.getResponseCode() != 200) {
      throw "Error fetching report " + response.getContentText();
    }

    return JSON.parse(response.getContentText());
  }

  this.getLineItem = function(advertiserId, lineItemId) {
    return apiCall(constants.ENDPOINT_ADVERTISER + advertiserId +
        constants.ENDPOINT_LINE_ITEM + lineItemId);
  }

  this.listInsertionOrders = function(advertiserId, filter, pageToken) {
    var endpoint = constants.ENDPOINT_ADVERTISER + advertiserId +
        constants.ENDPOINT_INSERTION_ORDER;
    var separator = "?";

    if(filter) {
      endpoint += separator + `${constants.FILTER_API}=` + filter;

      separator = '&';
    }

    if(pageToken) {
      endpoint += separator + `${constants.PAGE_TOKEN_API}=` + pageToken;
    }

    return apiCall(endpoint);
  }

  this.createSDFDownloadTask = function(advertiserId, idFilter) {
    var endpoint = constants.ENDPOINT_SDF_DOWNLOAD;

    return apiCall(endpoint, {
      "method": "post",
      "payload": JSON.stringify(
        {
          "version": constants.SDF_VERSION,
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
    var endpoint = task.response.resourceName + constants.ALT_PARAM;

    var url =  constants.CONTENT_API_URL + endpoint;

    var options = {
      'headers': {
        'accept': constants.CONTENT_TYPE_ZIP
      }
    };

    options.headers[constants.AUTHORIZATION_HEADER] = "Bearer " + ScriptApp.getOAuthToken();

    var response = UrlFetchApp.fetch(url, options);

    if(response.getResponseCode() != 200) {
      throw "Error fetching report " + response.getContentText();
    }

    var content = response.getBlob();

    content.setContentType(constants.CONTENT_TYPE_ZIP);

    return Utilities.unzip(content);
  }

  /**
   * Gets an advertiser from DV360 using the write API
   *
   * params:
   *  advertiserId: number with the advertiser id
   *
   * returns:
   *  advertiser object
   */
  this.getAdvertiser = function(advertiserId) {
    return apiCall(constants.ENDPOINT_ADVERTISER + advertiserId);
  }

}

var dvDAO;
function getDVDAO() {
  if(!dvDAO) {
    dvDAO = new DVDAO();
  }

  return dvDAO;
}
