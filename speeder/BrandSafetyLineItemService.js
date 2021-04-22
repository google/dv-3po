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

/**
 * Brand Safety Controls Line Item Service
 */
var BrandSafetyLineItemService = function (dvDAO) {

  this.tabName = constants.QA_TAB_NAME;
  this.keys = [constants.ADVERTISER_ID_HEADER, constants.LINE_ITEM_ID_HEADER];

  BaseLoader.call(this, dvDAO);

  /**
   * Identify items to be loaded based on values in defined by the user in the
   * entity's respective tab.
   *
   * params:
   *   job: The job passed by the sidebar
   *   job.itemsToLoad: Is populated with the items from DV that need to be
   *   loaded
   */
  this.identifyItemsToLoad = function (job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    job.itemsToLoad = [];
    job.idField = 'lineItemId';
    var feedItem = null;
    var advertisersMap = {};
    while (feedItem = feedProvider.next()) {
      var advertiserId = feedItem[constants.ADVERTISER_ID_HEADER];
      var insertionOrderId = feedItem[constants.INSERTION_ORDER_ID_HEADER];
      if (advertiserId && insertionOrderId) {
        if (advertisersMap[advertiserId]) {
          advertisersMap[advertiserId].add(insertionOrderId);
        } else {
          advertisersMap[advertiserId] = new Set();
          advertisersMap[advertiserId].add(insertionOrderId);
        }
      }
    }
    for (advertiserKey in advertisersMap) {
      insertionOrders = advertisersMap[advertiserKey];
      insertionOrders.forEach(insertionOrder => {
        var lineItems = dvDAO.listLineItems(advertiserKey, insertionOrder);
        var lineItemsMap = buildHelperLoaderMapListAction(lineItems, "lineItemId");
        var origTargetingOptionsRequests = getLineItemAssignedTargetingOptionsRequests(lineItems, advertiserKey);
        var responses = dvDAO.executeAll(origTargetingOptionsRequests);
        getTargetingOptionsBuilder().assignTargetingOptionsToLineItems(lineItemsMap, responses.success);
        job.itemsToLoad = job.itemsToLoad.concat(lineItems);
        logExecution(responses, origTargetingOptionsRequests, constants.LOAD_FROM_DV360_ERROR_KEY);
      });
    }
    return job;
  }

  /**
   * Builds a map out of an array
   *
   * Params:
   *    array: The array to be converted.
   *    key: The string that represents the key for each element.
   */
  function buildHelperLoaderMapListAction(array, key) {
    var map = {};
    array.forEach(function (item) {
      item.targetingOptions = getTargetingOptionsBuilder().buildTargetingOptionsForLineItems();
      map[item[key]] = item;
    });
    return map;
  }

  /**
   * Builds the line items targeting options requests to
   * retrieve the original targeting options.
   * The requests will be batched in groups of 1000.
   *
   * Params:
   *  lineItems: The list of line items for each insertion order.
   *  insertionOrder: The insertion order containing the list of
   *  line items.
   * Returns:
   *  A list of targeting option requests.
   */
  function getLineItemAssignedTargetingOptionsRequests(lineItems, insertionOrder) {
    var targetingOptionsRequests = [];
    var supportedTargeting = getTargetingOptionsBuilder().getSupportedTargetingOptions();
    lineItems.forEach(function (lineItem) {
      var targetingOptionsRequest = dvDAO.buildBulkListLineItemAssignedTargetingOptionsRequest(
        insertionOrder, lineItem.lineItemId, supportedTargeting);
      targetingOptionsRequests.push(targetingOptionsRequest);
    });
    return targetingOptionsRequests;
  }

  /**
   * Performs a DV360 push.
   */
  this.pushToDV360 = function (job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    var mapHelpers = buildHelperLoaderMapBulkEditAction(feedProvider);
    var advertisersMap = mapHelpers.advertisersMap;
    feedProvider.reset();
    var bulkEditTORequests = getBulkEditLineItemAssignedTargetingOptionsRequests(
      feedProvider, advertisersMap);
    var responses = dvDAO.executeAll(bulkEditTORequests);
    logExecution(responses, bulkEditTORequests, constants.PUSH_TO_DV360_ERROR_KEY);
    return job;
  }

  /**
   * Process errors after batch API execution.
   *
   * Params:
   *  responses: The list of responses retrieved by the batch API.
   *  requests: The list of requests sent to the API.
   *  errorType: A string representing the error type that will be logged.
   */
  function logExecution(responses, requests, errorType) {
    this.sheetDAO.clear(constants.ERRORS_TAB_NAME, constants.ERRORS_TAB_RANGE);
    this.sheetDAO.clear(constants.LOGS_TAB_NAME, constants.LOGS_TAB_RANGE);
    if (responses.errors.length > 0) {
      getBrandSafetyErrorHandler().processErrors(responses, requests, errorType);
    }
  }

  /**
   * Builds helper maps for advertisers and line items.
   * advertisersMap: contains advertiser's full targeting options lists
   * to compare to the new targeting options.
   * lineItemsMap: contains the new targeting options.
   *
   * Params:
   *  feedProvider: The feed provider that contains all the items in
   *  the QA tab.
   *
   * Returns:
   *  An object with the advertiser and line item maps.
   */
  function buildHelperLoaderMapBulkEditAction(feedProvider) {
    var advertisersMap = {};
    var lineItemsMap = {};
    while (feedItem = feedProvider.next()) {
      advertisersMap[feedItem[constants.ADVERTISER_ID_HEADER]] = {};
      lineItemsMap[feedItem[constants.LINE_ITEM_ID_HEADER]] = {
        "targetingOptions": getTargetingOptionsBuilder().buildTargetingOptionsForLineItems()
      };
    }
    for (advertiserKey in advertisersMap) {
      advertiser = advertisersMap[advertiserKey];
      var allSensitiveCategoriesMap = {};
      var allSensitiveCategories = dvDAO.listAllTargetingOptions(advertiserKey,
        constants.TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION);
      if (allSensitiveCategories.targetingOptions) {
        allSensitiveCategories.targetingOptions.forEach(function (sensitiveCategory) {
          var key = sensitiveCategory.sensitiveCategoryDetails.sensitiveCategory;
          allSensitiveCategoriesMap[key] = {
            "targetingOptionId": sensitiveCategory.targetingOptionId,
            "displayName": key
          };
        });
      }
      advertiser["allSensitiveCategoriesMap"] = allSensitiveCategoriesMap;
    }
    return { advertisersMap, lineItemsMap }
  }

  /**
   * Builds the bulk edit line item assigned targeting options
   * requests that will contain all the supported targeting
   * options in a sigle request.
   *
   * Params:
   *  feedProvider: The feed provider that contains all the items in
   *  the QA tab.
   *  advertisersMap: A map containing each advertiser object under its own key.
   *  This map contains full targeting options lists to compare with new assigned
   *  targeting options for the line items.
   *
   * Returns:
   *  A list of bulk edit requests.
   */
  function getBulkEditLineItemAssignedTargetingOptionsRequests(feedProvider, advertisersMap) {
    var bulkEditRequests = [];
    while (feedItem = feedProvider.next()) {
      var bulkCreateTOPayload = getTargetingOptionsBuilder().buildNewAssignedTargetingOptionsPayload(
        feedItem, advertisersMap);
      if (bulkCreateTOPayload) {
        var bulkEditRequest = dvDAO.buildBulkEditLineItemAssignedTargetingOptionsRequest(
          feedItem[constants.ADVERTISER_ID_HEADER], feedItem[constants.LINE_ITEM_ID_HEADER], bulkCreateTOPayload);
        bulkEditRequests.push(bulkEditRequest);
      }
    }
    return bulkEditRequests;
  }

  /**
   * Generates the QA report and writes to the sheet.
   *
   * params:
   *  job: The job passed by the UI
   *  job.itemsToLoad: list of DV360 IOs to load
   */
  this.generateQAReport = function (job) {
    var feed = [];

    forEach(job.itemsToLoad, function (index, insertionOrder) {
      var feedItem = {};

      feedItem[constants.ADVERTISER_ID_HEADER] = insertionOrder.advertiserId;
      feedItem[constants.INSERTION_ORDER_ID_HEADER] = insertionOrder.insertionOrderId;
      feedItem[constants.INSERTION_ORDER_NAME_HEADER] = insertionOrder.displayName;

      feed.push(feedItem);
    });

    new FeedProvider(this.tabName, this.keys).setFeed(feed).save();

    return job;
  }
}