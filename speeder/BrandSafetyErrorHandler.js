/***************************************************************************
*
*  Copyright 2021 Google Inc.
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

var BrandSafetyErrorHandler = function () {

  /**
   * Process the batch API errors. Since the API
   * does not return information about the request that
   * had the errors, the successful responses + the
   * original requests will be used to determine
   * the parameters to build the error reponses.
   *
   * Params:
   *  responses: The list of success/error responses.
   *  requests: The list of original requests sent to the
   *  batch API.
   *  errorType: A string representing the error type that will be logged.
   *
   * Returns:
   *  A list of error request logs.
   */
  this.processErrors = function (responses, requests, errorType) {
    var errorRequests = this.retrieveErrorRequests(responses.success, requests, errorType);
    var errorRequestLogs = buildErrorRequestLogs(errorRequests, errorType);
    var apiErrorLogs = buildAPIErrorLogs(responses.errors);
    logErrors(errorRequestLogs, apiErrorLogs);
    return errorRequestLogs;
  }

  /**
   * Retrieves the built error requests found out of the
   * original requests and success responses.
   * A comparison between the original requests and success responses
   * is made to figure out the error requests.
   *
   * Params:
   *  successResponses: The list of success responses.
   *  requests: The list of original requests sent to the batch API.
   *  errorType: A string representing the error type that will be logged.
   *
   * Returns:
   *  A list of error requests.
   */
  this.retrieveErrorRequests = function (successResponses, requests, errorType) {
    var errorRequestKeys = buildErrorRequestKeys(successResponses, requests, errorType);
    var errorsRequests = findErrorRequests(errorRequestKeys, requests);
    return errorsRequests;
  }

  /**
   * Builds the error request logs to be written
   * to the Log tab.
   *
   * Params:
   *  errorsRequests: A list of built error requests.
   *  errorType: A string representing the error type that will be logged.
   *
   * Returns:
   *  A list of error request logs.
   */
  function buildErrorRequestLogs(errorsRequests, errorType) {
    var errorRequestLogs = [];
    errorsRequests.forEach(err => {
      var keys = getRequestKeys(err.url, []);
      var logInfo = {};
      logInfo[constants.ADVERTISER_ID_HEADER] = keys.split("-")[0];
      logInfo[constants.LINE_ITEM_ID_HEADER] = keys.split("-")[1];
      logInfo[constants.STATUS_HEADER] = constants[errorType]
      errorRequestLogs.push(logInfo);
    });
    return errorRequestLogs;
  }

  /**
   * Builds the generic API reponse errors. These errors
   * do not contain request information, so they are not linked to any DV360
   * identifier(Advertiser ID, etc.) and they are just logged to the Errors tab.
   *
   * Params:
   *  errors: A list of generic API errors.
   *
   * Returns:
   *  A list of API error logs.
   */
  function buildAPIErrorLogs(errors) {
    var errorLogs = [];
    errors.forEach(err => {
      var logInfo = {};
      logInfo[constants.ERROR_CODE_HEADER] = err.error.code;
      logInfo[constants.ERROR_MESSAGE_HEADER] = err.error.message;
      errorLogs.push(logInfo);
    });
    return errorLogs;
  }

  /**
   * Logs both the errorRequestLogs and the apiErrorLogs
   * to their respective sheets Logs and Errors.
   *
   * Params:
   *  errorRequestLogs: A list of built error request logs.
   *  apiErrorLogs: A list of generic API error logs.
   */

  function logErrors(errorRequestLogs, apiErrorLogs) {
    var sheet = new SheetDAO();
    sheet.clear(constants.ERRORS_TAB_NAME, constants.ERRORS_TAB_RANGE);
    sheet.dictToSheet(constants.ERRORS_TAB_NAME, apiErrorLogs);
    sheet.clear(constants.LOGS_TAB_NAME, constants.LOGS_TAB_RANGE);
    sheet.dictToSheet(constants.LOGS_TAB_NAME, errorRequestLogs);
    sheet.goToTab(constants.LOGS_TAB_NAME);
  }

  function buildErrorRequestLogsForClient(errorsRequests, errorType) {
    var logs = [];
    var logsData = [];
    // Build 2D array to set in the Log tab
    errorsRequests.forEach(errRequest => {
      var keys = getRequestKeys(errRequest.url, []);
      logsData.push(keys.split("-")[0]);
      logsData.push(keys.split("-")[1]);
      logsData.push(constants[errorType]);
      logs.push(logsData);
    });
    return logs;
  }

  /**
   * Finds and builds error requests out of
   * original requests and successful responses.
   *
   * Params:
   *  errorRequestKeys: A list of advertiserId-LineItemId strings.
   *  requests: The original requests sent to the batch API.
   *
   * Returns:
   *  A list of built error requests.
   */
  function findErrorRequests(errorRequestKeys, requests) {
    var errorRequests = [];
    errorRequestKeys.forEach(errKey => {
      var found = requests.filter(request => {
        var keys = getRequestKeys(request.url, []);
        return keys === errKey;
      });
      if (found && found.length > 0) {
        errorRequests.push(found[0]);
      }
    });
    return errorRequests;
  }

  /**
   * Contructs a list of advertiserId-LineItemId strings
   * to be used when figuring out the error requests.
   * Original requests and successful responses are used
   * to find the difference = error reponses.
   *
   * Params:
   *  successResponses: The list of successful responses.
   *  requests: The original requests sent to the batch API.
   *  errorType: A string representing the error type that will be logged.
   *
   * Returns:
   *  A list of the found error request keys.
   */
  function buildErrorRequestKeys(successResponses, requests, errorType) {
    var successRequests = [];
    successResponses.forEach(sr => {
      var assignedTOs = [];
      switch (errorType) {
        case constants.LOAD_FROM_DV360_ERROR_KEY:
          assignedTOs = sr.assignedTargetingOptions;
          break;
        case constants.PUSH_TO_DV360_ERROR_KEY:
          assignedTOs = sr.createdAssignedTargetingOptions;
          break;
        default:
          break;
      }
      if (assignedTOs && assignedTOs.length > 0) {
        // Assume for now that all BSC in this reponse were set correctly.
        var to = assignedTOs[0];
        getRequestKeys(to.name, successRequests);
      }
    });
    var allRequests = [];
    requests.forEach(request => {
      getRequestKeys(request.url, allRequests);
    });
    var errorRequestKeys = getUtils().missingItems(successRequests, allRequests);
    return errorRequestKeys;
  }

  /**
   * Retrieves the URL suffix from an API endpoint.
   *
   * Params:
   *  url: The base URL.
   *
   * Returns:
   *  A string representing the URL suffix.
   */
  function getURLSuffix(url) {
    var index = url.indexOf("/advertisers") + 1;
    var urlSuffix = url.substring(index, url.length);
    return urlSuffix;
  }

  /**
   * Gets the keys (advertiserId-LineItemId) out of the
   * endpoint URL in the successResponses list.
   *
   * Params:
   *  url: The base URL.
   *  keys: An array that will store the keys.
   *
   * Returns:
   *  A list of found keys.
   */
  function getRequestKeys(url, keys) {
    url = getURLSuffix(url);
    var parts = url.split("/");
    var key;
    if (parts.length > 3) {
      var advertierId = parts[1];
      var lineItemId = parts[3];
      if (lineItemId.indexOf(":") !== -1) {
        // Removing last part of request URL
        var index = lineItemId.indexOf(":");
        lineItemId = lineItemId.substring(0, index);
      }
      if (advertierId && lineItemId) {
        key = `${advertierId}-${lineItemId}`;
        keys.push(key);
      }
    }
    return key;
  }

};

/**
 * Singleton implementation for BrandSafetyErrorHandler
 */
var brandSafetyErrorHandler = null;

function getBrandSafetyErrorHandler() {
  if (!brandSafetyErrorHandler) {
    brandSafetyErrorHandler = new BrandSafetyErrorHandler();
  }
  return brandSafetyErrorHandler
}