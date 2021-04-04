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
  const BASE_BATCH_API_URL = "https://displayvideo.googleapis.com/batch";

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
   * Executes calls to the batch API.
   *
   * params:
   *  requests: A list of requests that will be
   *  executed in batches of 1000 elements.
   *
   * returns:
   *  A list of the successful/error responses retrieved by the API.
   */
  this.executeAll = function(requests) {
    return batchAPICall(requests)
  }

  /**
   * Sends the requests to the batch API.
   *
   * Params:
   *  requests: A list of requests that will be
   *  executed in batches of 1000 elements.
   *
   * Returns:
   *  A list of the successful/error responses retrieved by the API.
   */
  function batchAPICall(requests) {
    var batches = createBatches(requests);
    var responses = [];
    batches.forEach(innerRequests => {
      var boundary = "xxxxxxxxxx";
      var data = buildInnerRequests(innerRequests, boundary);
      var payload = Utilities.newBlob(data).getBytes();
      var options = {
        method: "POST",
        contentType: "multipart/mixed; boundary=" + boundary,
        payload: payload,
        headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
      };
      var response = UrlFetchApp.fetch(BASE_BATCH_API_URL, options);
      if(response.getResponseCode() != 200) {
        throw "Error calling the batch API" + response.getContentText();
      }
      var parsedResponse = parseBatchResponse(response.getContentText());
      responses = responses.concat(parsedResponse.success);
      var errors = parsedResponse.errors; // TODO: Handle error retry
      console.log("Successful reponses BATCH API length -> " + parsedResponse.success.length);
      console.log("Errors BATCH API length -> " + parsedResponse.errors.length);
    });
    return responses;
  }

  /**
   * Builds inner requests for the batched requests.
   *
   * Params:
   *  innerRequests: A list of requests within a parent
   *  request.
   *  boundary: A string used to delimit each inner request.
   *
   * Returns:
   *  The string paylod for the inner requests.
   */
  function buildInnerRequests(innerRequests, boundary) {
    var contentId = 0;
    var data = "--" + boundary + "\r\n";
      innerRequests.forEach(req => {
        data += "Content-Type: application/http\r\n";
        data += "Content-ID: " + ++contentId + "\r\n\r\n";
        data += req.method + " " + req.url + "\r\n";
        data += req.payload ? "Content-Type: application/json; charset=utf-8\r\n\r\n" : "\r\n";
        data += req.payload ? JSON.stringify(req.payload) + "\r\n" : "";
        data += "--" + boundary + "\r\n";
    });
    return data;
  }

  /**
   * Splits the total number of requests into batches
   * of 1000 elements.
   *
   * Params:
   *  array: Full array of requests.
   *
   * Returns:
   *  A list of lists containing the batches of 1000
   * elements.
   */
  function createBatches(array) {
    var tempArray;
    var limit = 1000;
    var batches = [];
    for (var i = 0, j = array.length; i < j; i += limit) {
        tempArray = array.slice(i, (i + limit));
        batches.push(tempArray);
    }
    return batches;
  }

  /**
   * Parses a multi-part response retrieved by the
   * batch API.
   *
   * Params:
   *  response: The response retrieved by the API.
   *
   * Returns:
   *  A response object containing the parsed successful and failed
   *  responses.
   */
  function parseBatchResponse(response) {
    var boundary= '--batch_';
    var parsedReponses = {
      "success": [],
      "errors": []
    }
    // Identify and parse each inner response within the batched response.
    // Finds the first and last curly brackets to get the specific response.
    var regExp = /\{([^)]+)\}/;
    try {
      var responseLines = response.split(boundary);
      responseLines.forEach(response => {
        var matches = regExp.exec(response);
        if (!matches || (matches && matches.length == 0))
          return true
        responseJson = JSON.parse(matches[0]);
        if(!responseJson["error"]) {
          parsedReponses["success"].push(responseJson);
        } else {
          parsedReponses["errors"].push(responseJson);
        }
      });
    }catch(ex) {
      throw ex
    }
    return parsedReponses
  }

  /**
   * Builds the request object specified by the API caller.
   *
   * Params:
   *  method: The method type.
   *  urlSuffix: The suffix for the base URL.
   *  payload: The request payload.
   *
   * Returns:
   *  A request object specified by the API.
   */
  function buildRequest (method, urlSuffix, payload) {
    var url = BASE_API_URL + urlSuffix;
    return {
      method: method,
      url: url,
      payload: payload
    }
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
   *  fields - default param: A list of fields to be retrieved by the API.
   *
   * returns:
   *  List of line items under the specified insertion order
   */
  this.listLineItems = function(advertiserId, insertionOrderId, 
  fields = ["lineItemId", "name", "displayName", "lineItemType", "insertionOrderId", "advertiserId", "campaignId"]) {
    var result = [];
    var apiUrl = "/advertisers/" + advertiserId + "/lineItems?filter=insertionOrderId=" + insertionOrderId
    + "&fields=lineItems(" + fields.join(",") + "),nextPageToken";
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
   * Lists single targeting options of a given line item
   */
  this.listTargetingOptions = function(advertiserId, lineItemId, targetingType) {
    return apiCall("/advertisers/" + advertiserId + "/lineItems/" + lineItemId
        + "/targetingTypes/" + targetingType + "/assignedTargetingOptions");
  }

  /**
   * Builds single targeting options requests to be used in the Batch API
   *
   * Params:
   *  advertiserId: Advertiser ID.
   *  lineItemId: Line Item ID.
   *  targetingType: String representing the targeting type enum value.
   */
  this.buildListTargetingOptionsRequest = function(advertiserId, lineItemId, targetingType) {
    var urlSuffix = "/advertisers/" + advertiserId + "/lineItems/" + lineItemId
        + "/targetingTypes/" + targetingType + "/assignedTargetingOptions";
    return buildRequest("GET", urlSuffix)
  }

  /**
   * Lists all targeting option items under an advertiser
   *
   * Params:
   *  advertiserId: Advertiser ID.
   *  targetingType: String representing the targeting type enum value.
   */
  this.listAllTargetingOptions = function(advertiserId, targetingType) {
    return apiCall("/targetingTypes/" + targetingType + "/targetingOptions?advertiserId=" + advertiserId);
  }

  /**
   * Creates a new targeting option associated with the specified line item
   *
   * Params:
   *  advertiserId: Advertiser ID.
   *  lineItemId: Line item ID.
   *  targetingType: String representing the targeting type enum value.
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

  /**
   * Builds a single new add targeting option request associated with the
   * specified line item.
   *
   * Params:
   *  advertiserId: Advertiser ID.
   *  lineItemId: Line item ID.
   *  targetingType: String representing the targeting type enum value.
   *  targetingOption: Object with the targeting option as specified by the API.
   */
  this.buildAddTargetingOptionRequest = function(advertiserId, lineItemId, targetingType,
      targetingOption) {
    var urlSuffix = "/advertisers/" + advertiserId + "/lineItems/" +
        lineItemId + "/targetingTypes/" + targetingType +
      "/assignedTargetingOptions";
    return buildRequest("POST", urlSuffix, targetingOption)
  }

  /**
   * Builds a new bulk edit targeting option request associated with the
   * specified line item.
   *
   * Params:
   *  advertiserId: Advertiser ID.
   *  lineItemId: Line item ID.
   *  targetingOptions: Object with the targeting options as specified by the API.
   */
  this.buildBulkEditLineItemAssignedTargetingOptionsRequest = function(advertiserId, lineItemId,
      targetingOptions) {
    var urlSuffix = "/advertisers/" + advertiserId + "/lineItems/" +
    lineItemId + ":bulkEditLineItemAssignedTargetingOptions";
    return buildRequest("POST", urlSuffix, targetingOptions)
  }

  /**
   * Builds requests associated with the specified line item to list its
   * targeting options in bulk.
   *
   * Params:
   *  advertiserId: Advertiser ID.
   *  lineItemId: Line item ID.
   *  supportedTargeting: The targeting option types to be retrieved.
   */
  this.buildBulkListLineItemAssignedTargetingOptionsRequest = function(advertiserId, lineItemId,
    supportedTargeting) {
    var targeting = "targetingType=" + supportedTargeting.join("%20OR%20targetingType=");
    var urlSuffix = "/advertisers/" + advertiserId + "/lineItems/" +
    lineItemId + ":bulkListLineItemAssignedTargetingOptions?filter=" + targeting;
    return buildRequest("GET", urlSuffix)
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