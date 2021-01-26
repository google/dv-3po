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
        feedItem['Advertiser ID'] = insertionOrder.advertiserId;
        feedItem['Insertion Order ID'] = insertionOrder.insertionOrderId;
        feedItem['Insertion Order Name'] = insertionOrder.displayName;
      }

      if(lineItem) {
        feedItem['Line Item ID'] = lineItem.lineItemId;
        feedItem['Line Item Name'] = lineItem.displayName;

        console.log(lineItem);
        if(lineItem.keywordTargeting) {
          keywordExclusions = [];
          keywordInclusions = [];

          forEach(lineItem.keywordTargeting, function(index, keyword) {
            if(keyword.keywordDetails.negative) {
              keywordExclusions.push(keyword.keywordDetails.keyword);
            } else {
              keywordInclusions.push(keyword.keywordDetails.keyword);
            }
          });

          feedItem['Keyword Exclusions'] = keywordExclusions.join(',');
          feedItem['Keyword Inclusions'] = keywordInclusions.join(',');
        }
      }

      result.push(feedItem);
    });

    return result;
  }
}
