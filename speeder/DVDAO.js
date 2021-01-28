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

  /**
   * Fetches a particular line item
   *
   * params:
   *  advertierId: the advertiser id
   *  lineItemId: the line item id
   *
   * returns:
   *  Line item object from DV
   */
  this.getLineItem = function(advertiserId, lineItemId) {
    return apiCall("/advertisers/" + advertiserId + "/lineItems/" + lineItemId);
  }

  /**
   * Lists all line items under a specific insertion order
   *
   * params:
   *  advertiserId: Advertiser ID
   *  insertionOrderId: Insertion order ID
   *
   * returns:
   *  List of line items under the specified insertion order
   */
  this.listLineItems = function(advertiserId, insertionOrderId) {
    var result = [];
    var apiUrl = "/advertisers/" + advertiserId + "/lineItems?filter=insertionOrderId=" + insertionOrderId;
    var response = apiCall(apiUrl);

    while(response && response.lineItems && response.lineItems.length > 0) {
      result = result.concat(response.lineItems);

      if(response.nextPageToken) {
        response = apiCall(apiUrl + '&pageToken=' + response.nextPageToken);
      } else {
        response = {};
      }
    }

    return result;
  }

  /**
   * Fetches a particular insertion order
   *
   * params:
   *  advertiserId: The advertiser id under which the desired IO is
   *  insertionOrderId: Unique identifier of the insertion order
   *
   * returns:
   *  DV360 insertion order
   */
  this.getInsertionOrder = function(advertiserId, insertionOrderId) {
    return apiCall("/advertisers/" + advertiserId + "/insertionOrders/" + insertionOrderId);
  }

  this.patchLineItem = function(lineItem, updateMask) {
    return apiCall("/advertisers/" + lineItem.advertiserId + "/lineItems/" +
        lineItem.lineItemId + "?updateMask=" + updateMask, {
      "method": "patch",
      "payload": JSON.stringify(lineItem),
    });
  }

  /**
   * Lists targeting options of a specific type of a given line item
   */
  this.listTargetingOptions = function(advertiserId, lineItemId, targetingType) {
    return apiCall("/advertisers/" + advertiserId + "/lineItems/" + lineItemId
        + "/targetingTypes/" + targetingType + "/assignedTargetingOptions");
  }

  /**
   * Creates a new targeting option associated with the specified line item
   *
   * params:
   *  advertiserId: Advertiser ID
   *  lineItemId: Line item ID
   *  targetingType: String representing the targeting type enum value from the
   *  API
   *  targetingOption: Object with the targeting option as specified by the API
   */
  this.addTargetingOption = function(advertiserId, lineItemId, targetingType,
      targetingOption) {
    return apiCall("/advertisers/" + advertiserId + "/lineItems/" +
        lineItemId + "/targetingTypes/" + targetingType +
        "/assignedTargetingOptions", {
      "method": "post",
      "payload": JSON.stringify(targetingOption),
    });
  }
}

/**
 * Singleton implementation for the DV DAO
 */
var dao = null;
function getDVDAO() {
  if(!dao) {
    dao = new DVDAO();
  }

  return dao;
}