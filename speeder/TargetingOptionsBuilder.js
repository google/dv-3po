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
                            case constants.TARGETING_TYPE_KEYWORD:
                                var kd = targeting.keywordDetails;
                                if (kd.negative) {
                                    foundLI.targetingOptions.keywordTargeting.keywordExclusions.push(
                                        kd.keyword);
                                } else {
                                    foundLI.targetingOptions.keywordTargeting.keywordInclusions.push(
                                        kd.keyword);
                                }
                                break;
                            case constants.TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION:
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
     *  feedItem: The current feed item representing the lineItem above.
     *  advertisersMap: A map containing each advertiser object under its own key.
     *  This map contains full targeting options lists to compare with new assigned
     *  targeting options for the line items.
     *
     * Returns:
     *  A list of new assigned tarting options for a line item.
     */
    this.buildNewAssignedTargetingOptionsPayload = function (feedItem, advertisersMap) {
        var supportedTargetingOptions = this.getSupportedTargetingOptions();
        var newAssignedTargetingOptions = [];
        supportedTargetingOptions.forEach(supportedTO => {
            var newAssignedTargetingOption = {
                "targetingType": supportedTO
            }
            switch (supportedTO) {
                case constants.TARGETING_TYPE_KEYWORD:
                    newAssignedTargetingOption["assignedTargetingOptions"] = buildAllKeywordPayloads(feedItem);
                    break;
                case constants.TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION:
                    newAssignedTargetingOption["assignedTargetingOptions"] = buildSensitiveCategoryPayloads(
                        advertisersMap[feedItem[constants.ADVERTISER_ID_HEADER]].allSensitiveCategoriesMap,
                        feedItem);
                    break;
                default:
                    break;
            }
            if(validBSOptions(newAssignedTargetingOption.assignedTargetingOptions)) {
                newAssignedTargetingOptions.push(newAssignedTargetingOption);
            }
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
     *  This will be used to compare and identify the new keywords to be added.
     *  feedItem: The current feed item representing the lineItem.
     *
     * Returns:
     *  A list of keywords payloads for the bulk request.
     */
    function buildAllKeywordPayloads(feedItem) {
        var allKeywordPayloads = [];
        var newKeywordInclusions = feedItem[constants.KEYWORD_INCLUSIONS_HEADER].split(',');
        allKeywordPayloads = allKeywordPayloads.concat(buildKeywordPayloads(
            newKeywordInclusions, false))
        var newKeywordExclusions = feedItem[constants.KEYWORD_EXCLUSIONS_HEADER].split(',');
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
        if(validBSOptions(keywords)) {
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
        }
        return payloads;
    }

    /**
     * Builds the payloads for the sensitive categories targeting options.
     *
     * Params:
     *  allSensitiveCategoriesMap: A list of all supported sensitive
     *  categories within an advertiser. This will be used to obtain
     *  the sensitive category id for the new targeting options.
     *  feedItem: The current feed item representing the lineItem.
     *
     * Returns:
     *  A list of sensitive categories payloads for the bulk request.
     */
    function buildSensitiveCategoryPayloads(allSensitiveCategoriesMap, feedItem) {
        var sensitiveCategoryPayloads = [];
        var newSensitiveCategoryExclusions = feedItem[constants.SENSITIVE_CATEGORIES_HEADER].split(',');
        if(validBSOptions(newSensitiveCategoryExclusions)) {
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
        }
        return sensitiveCategoryPayloads;
    }

    /**
     * Validates brand safety options.
     *
     * Params:
     *  array: A list of brand safety options.
     *
     * Returns:
     *  A boolean for valid/invalid brand safety options.
     */
    function validBSOptions(array) {
        return array.length > 0 && array[0];
    }

    /**
     * Builds the supported targeting options that will
     * be considered to create the bulk edit requests.
     * The targeting options will be enabled/disabled according
     * to the user configuration in the BS Config tab.
     *
     * Returns:
     *  A list containing the supported targeting options.
     */
    this.getSupportedTargetingOptions = function () {
        var sheetDao = new SheetDAO();
        var configData = sheetDao.sheetToDict(constants.BS_CONFIG_TAB_NAME);
        var supportedTargetingOptions = [];
        configData.forEach(bs => {
            var bsType = bs[constants.BRAND_SAFETY_CONTROL_HEADER];
            var enabled = bs[constants.ENABLED_HEADER]
            if (enabled) {
                supportedTargetingOptions.push(bsType);
            }
        });
        return supportedTargetingOptions;
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