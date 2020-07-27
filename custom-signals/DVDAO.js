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

  // Service responsible for authenticating and generating access tokens
  // to authenticate API calls
  var service = new DVService().getDVService();

  const BASE_API_URL = "https://displayvideo.googleapis.com/v1";

  // Setup the service and perform authentication if needed
  if(!service.hasAccess()) {
    var t = HtmlService.createTemplateFromFile('Authorization');
    t.authorizationURL = service.getAuthorizationUrl();
    var output = t.evaluate();
    output.setTitle("Authorization");

    SpreadsheetApp.getUi().showSidebar(output);
  }

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

    options.headers['Authorization'] = "Bearer " + service.getAccessToken();
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

  this.patchLineItem = function(lineItem, updateMask) {
    return apiCall("/advertisers/" + lineItem.advertiserId + "/lineItems/" +
        lineItem.lineItemId + "?updateMask=" + updateMask, {
      "method": "patch",
      "payload": JSON.stringify(lineItem),
    });
  }
}
