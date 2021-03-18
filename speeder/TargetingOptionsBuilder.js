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

var TargetingOptionsBuilder = function () {

    var TARGETING_TYPE_KEYWORD = "TARGETING_TYPE_KEYWORD";
    var TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION = "TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION";

    /**
     * Assigns the targeting options to the respective line item.
     * Since the requests are batched in groups
     * after getting the reponse from the batch API, the targeting
     * options need to be reassigned.
     *
     * Params:
     *  lineItemsMap: A map containing each line item object under its own key.
     *  originalTargetingOptions: A list of the original targeting options
     * responses that need to be reassigned to their respective line item.
     *
     * Returns:
     *  The lineItemsMap with the original targeting options assigned.
     */
    this.assignTargetingOptionsToLineItems = function (lineItemsMap, originalTargetingOptions) {
        originalTargetingOptions.forEach(function (orginalTargetingOption) {
            if (orginalTargetingOption.assignedTargetingOptions) {
                var targetingOptions = orginalTargetingOption.assignedTargetingOptions;
                targetingOptions.forEach(function (targeting) {
                    var targetingParams = targeting.name ? targeting.name.split("/") : [];
                    var lineItemId = targetingParams.length > 3 ? targetingParams[3] : "";
                    var foundLI = lineItemsMap[lineItemId];
                    if (foundLI) {
                        switch (targeting.targetingType) {
                            case TARGETING_TYPE_KEYWORD:
                                var kd = targeting.keywordDetails;
                                if (kd.negative) {
                                    foundLI.targetingOptions.keywordTargeting.keywordExclusions.push(
                                        kd.keyword);
                                } else {
                                    foundLI.targetingOptions.keywordTargeting.keywordInclusions.push(
                                        kd.keyword);
                                }
                                break;
                            case TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION:
                                foundLI.targetingOptions.sensitiveCategoryTargeting.push(
                                    targeting.sensitiveCategoryExclusionDetails.sensitiveCategory);
                                break;
                            default:
                                break;
                        }
                    }
                });
            }
        });
        return lineItemsMap;
    }

    /**
     * Builds the new assigned targeting options for the line items in
     * a single request.
     *
     * Params:
     *  lineItem: The line item to assign the new targeting options to.
     *  feedItem: The current feed item representing the lineItem above.
     *  advertisersMap: A map containing each advertiser object under its own key.
     *  This map contains full targeting options lists to compare with new assigned
     *  targeting options for the line items.
     *
     * Returns:
     *  A list of new assigned tarting options for a line item.
     */
    this.buildNewAssignedTargetingOptionsPayload = function (lineItem, feedItem, advertisersMap) {
        var supportedTargetingOptions = this.getSupportedTargetingOptions();
        var newAssignedTargetingOptions = [];
        supportedTargetingOptions.forEach(supportedTO => {
            var newAssignedTargetingOption = {
                "targetingType": supportedTO
            }
            switch (supportedTO) {
                case TARGETING_TYPE_KEYWORD:
                    newAssignedTargetingOption["assignedTargetingOptions"] = buildAllKeywordPayloads(
                        lineItem.targetingOptions.keywordTargeting, feedItem);
                    break;
                case TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION:
                    newAssignedTargetingOption["assignedTargetingOptions"] = buildSensitiveCategoryPayloads(
                        lineItem.targetingOptions.sensitiveCategoryTargeting,
                        advertisersMap[feedItem['Advertiser ID']]["allSensitiveCategoriesMap"], feedItem);
                    break;
                default:
                    break;
            }
            newAssignedTargetingOptions.push(newAssignedTargetingOption);
        });
        var payload = {
            "createRequests": newAssignedTargetingOptions
        };
        return payload;
    }

    /**
     * Builds the payloads for the keywords targeting options,
     * considering negative and positive keywords.
     *
     * Params:
     *  keywordTargeting: The original keyword targeting for the line item.
     *  This will be used to compare and identify the new keywords to be added.
     *  feedItem: The current feed item representing the lineItem.
     *
     * Returns:
     *  A list of keywords payloads for the bulk request.
     */
    function buildAllKeywordPayloads(keywordTargeting, feedItem) {
        var allKeywordPayloads = [];
        var newKeywordInclusions = missingItems(keywordTargeting.keywordInclusions,
            feedItem['Keyword Inclusions'].split(','));
        allKeywordPayloads = allKeywordPayloads.concat(buildKeywordPayloads(
            newKeywordInclusions, false))
        var newKeywordExclusions = missingItems(keywordTargeting.keywordExclusions,
            feedItem['Keyword Exclusions'].split(','));
        allKeywordPayloads = allKeywordPayloads.concat(buildKeywordPayloads(
            newKeywordExclusions, true));
        return allKeywordPayloads;
    }

    /**
     * Builds single keyword payload targeting options,
     * for keyword inclusions and exclusions.
     *
     * Params:
     *  keywords: The keyword inclusion/exclusion list.
     *  isNegative: A flag indicating if the list is inclusion or exclusion.
     *
     * Returns:
     *  A list of keywords payloads for the bulk request.
     */
    function buildKeywordPayloads(keywords, isNegative) {
        var payloads = [];
        keywords.forEach(function (keyword) {
            if (keyword) {
                var payload = {
                    'keywordDetails': {
                        'keyword': keyword,
                        'negative': isNegative
                    }
                };
                payloads.push(payload);
            }
        });
        return payloads;
    }

    /**
     * Builds the payloads for the sensitive categories targeting options.
     *
     * Params:
     *  sensitiveCategories: The original sensitive categories targeting
     *  for the line item.
     *  This will be used to compare and identify the new sensitive
     *  categories to be added.
     *  allSensitiveCategoriesMap: A list of all supported sensitive
     *  categories within an advertiser. This will be used to obtain
     *  the sensitive category id for the new targeting options.
     *  feedItem: The current feed item representing the lineItem.
     *
     * Returns:
     *  A list of sensitive categories payloads for the bulk request.
     */
    function buildSensitiveCategoryPayloads(sensitiveCategories, allSensitiveCategoriesMap,
        feedItem) {
        var sensitiveCategoryPayloads = [];
        var newSensitiveCategoryExclusions = missingItems(sensitiveCategories,
            feedItem['Sensitive Category Exclusions'].split(','));
        newSensitiveCategoryExclusions.forEach(function (sensitiveCategory) {
            var scFound = allSensitiveCategoriesMap[sensitiveCategory];
            if (scFound) {
                var payload = {
                    "sensitiveCategoryExclusionDetails": {
                        "excludedTargetingOptionId": scFound.targetingOptionId,
                        "sensitiveCategory": sensitiveCategory
                    }
                };
                sensitiveCategoryPayloads.push(payload);
            }
        });
        return sensitiveCategoryPayloads;
    }

    /**
     * Builds the supported targeting options that will
     * be considered to create the bulk edit requests.
     * The targeting options will be enabled/disabled according
     * to the user configuration in the BS Config tab.
     *
     * Returns:
     *  An object containing the supported targeting options.
     */
    this.getSupportedTargetingOptions = function () {
        var sTOs = [TARGETING_TYPE_KEYWORD, TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION];
        return sTOs;
    }

    /**
     * Returns a list of items of list 2 that are not included in list 1
     *
     * params:
     *  list1: array of strings
     *  list2: array of strings
     *
     * returns: array of strings of items in list 2 that are not included in list 1
     */
    function missingItems(list1, list2) {
        var result = [];
        forEach(list2, function (index, item) {
            if (list1.indexOf(item) == -1) {
                result.push(item);
            }
        });
        return result;
    }

    /**
     * Builds the supported line item targeting options.
     * Returns:
     *  The targeting options object for a line item.
     */
    this.buildTargetingOptionsForLineItems = function () {
        return {
            "keywordTargeting": {
                "keywordInclusions": [],
                "keywordExclusions": []
            },
            "sensitiveCategoryTargeting": []
        }
    }

};

/**
 * Singleton implementation for the targeting options builder
 */
var targetingOptionsBuilder = null;

function getTargetingOptionsBuilder() {
    if (!targetingOptionsBuilder) {
        targetingOptionsBuilder = new TargetingOptionsBuilder();
    }
    return targetingOptionsBuilder
}