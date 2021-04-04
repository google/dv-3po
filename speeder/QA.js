/**
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

/**
 * This module provides functionality to build various QA reports
 */
var QA = function() {

  /**
   * Calls the handler function for each line item the hierarchy
   *
   * params:
   *  hierarchy: DV Object hierarchy
   *  handler: function(insertionOrder, lineItem)
   */
  forEachLineItem = function(hierarchy, handler) {
    forEach(hierarchy, function(index, insertionOrder) {
      if(insertionOrder.lineItems && insertionOrder.lineItems.length > 0) {
        forEach(insertionOrder.lineItems, function(index, lineItem) {
          handler(insertionOrder, lineItem);
        });
      } else {
        handler(insertionOrder, null);
      }
    });

  }
  /**
   * Builds the default QA report for a hierarchy of DV objects
   *
   * params:
   *  hierarchy: DV Object hierarchy
   *
   * returns:
   *   Feed ready to be written to the sheet
   */
  this.defaultQAReport = function(hierarchy) {
    var result = [];
    forEachLineItem(hierarchy, function(insertionOrder, lineItem) {
      var feedItem = {};
      if(insertionOrder) {
        feedItem[constants.ADVERTISER_ID_HEADER] = insertionOrder.advertiserId;
        feedItem[constants.INSERTION_ORDER_ID_HEADER] = insertionOrder.insertionOrderId;
        feedItem[constants.INSERTION_ORDER_NAME] = insertionOrder.displayName;
      }
      if(lineItem) {
        feedItem[constants.LINE_ITEM_ID_HEADER] = lineItem.lineItemId;
        feedItem[constants.LINE_ITEM_NAME_HEADER] = lineItem.displayName;
        if(lineItem.targetingOptions) {
          if( lineItem.targetingOptions.keywordTargeting) {
            feedItem[constants.ORIGINAL_KEYWORD_EXCLUSIONS_HEADER] = lineItem.targetingOptions.keywordTargeting.keywordExclusions.join(',');
            feedItem[constants.ORIGINAL_KEYWORD_INCLUSIONS_HEADER] = lineItem.targetingOptions.keywordTargeting.keywordInclusions.join(',');
          }
          if(lineItem.targetingOptions.sensitiveCategoryTargeting) {
            feedItem[constants.ORIGINAL_SENSITIVE_CATEGORIES_HEADER] = lineItem.targetingOptions.sensitiveCategoryTargeting.join(',');
          }
        }
        feedItem[constants.STATUS_HEADER] = constants.STATUS_LOADED;
      }
      result.push(feedItem);
    });
    return result;
  }
}