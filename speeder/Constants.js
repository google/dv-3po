/*
 * Copyright 2021 Google Inc.
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

var constants = {
  // Field names
  "LINE_ITEM_ID_HEADER" : "Line Item ID",
  "LINE_ITEM_NAME_HEADER": "Line Item Name",
  "ADVERTISER_ID_HEADER": 'Advertiser ID',
  "INSERTION_ORDER_ID_HEADER": "Insertion Order ID",
  "INSERTION_ORDER_NAME_HEADER": "Insertion Order Name",
  "KEYWORD_INCLUSIONS_HEADER": "Keyword Inclusions",
  "KEYWORD_EXCLUSIONS_HEADER": "Keyword Exclusions",
  "SENSITIVE_CATEGORIES_HEADER": "Sensitive Category Exclusions",
  "ORIGINAL_KEYWORD_INCLUSIONS_HEADER": "Original Keyword Inclusions",
  "ORIGINAL_KEYWORD_EXCLUSIONS_HEADER": "Original Keyword Exclusions",
  "ORIGINAL_SENSITIVE_CATEGORIES_HEADER": "Original Sensitive Category Exclusions",
  "LINE_ITEMS_HEADER": "Line Items",
  "STATUS_HEADER": "Status",
  "BRAND_SAFETY_CONTROL_HEADER": "Brand Safety Control",
  "ENABLED_HEADER": "Enabled",
  "ERROR_CODE_HEADER": "Error Code",
  "ERROR_MESSAGE_HEADER": "Error Message",
  "AD_GROUP_ID_HEADER": "Ad Group ID",
  "AD_GROUP_NAME_HEADER": "Ad Group Name",
  "AD_ID_HEADER": "Ad ID",
  "AD_NAME_HEADER": "Ad Name",
  "PLACEMENT_NAME_HEADER": "Tracking Placement Name",
  "TRACKING_AD_NAME_HEADER": "Tracking Ad Name",
  "CREATIVE_NAME_HEADER": "Tracking Creative Name",
  "TRACKING_PLACEMENT_ID_HEADER": "Tracking Placement ID",
  "TRACKING_AD_ID_HEADER": "Tracking Ad ID",
  "TRACKING_CREATIVE_ID_HEADER": "Tracking Creative ID",
  // Status
  "STATUS_UNCHANGED" : "UNCHANGED",
  "STATUS_MODIFIED" : `%s MODIFIED`,
  "STATUS_LOADED": "LOADED",
  // Tab Names
  "LI_KEYWORD_INCLUSIONS_TAB_NAME" : "Line Items For Keyword Inclusions",
  "LI_KEYWORD_EXCLUSIONS_TAB_NAME" : "Line Items For Keyword Exclusions",
  "LI_SENSITIVE_CATEGORY_EXCLUSIONS_TAB_NAME" : "Line Items For Sensitive Category Exclusions",
  "BS_CONFIG_TAB_NAME": "BS Config",
  "QA_TAB_NAME": "QA",
  "LOGS_TAB_NAME": "Log",
  "ERRORS_TAB_NAME": "Errors",
  // Keys
  "LI_TO_MODIFY_KEY" : "lineItemsToModify",
  "LI_TO_MODIFY_TAB_NAME_KEY" : "lineItemsToModifyTabName",
  "NEW_BS_ITEMS_TO_ADD_KEY" : "newBSItemsToAdd",
  "PUSH_TO_DV360_ERROR_KEY": "PUSH_TO_DV360_ERROR",
  "LOAD_FROM_DV360_ERROR_KEY": "LOAD_FROM_DV360_ERROR",
  // Targeting Types
  "TARGETING_TYPE_KEYWORD" : "TARGETING_TYPE_KEYWORD",
  "TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION" : "TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION",
  // Errors
  "PUSH_TO_DV360_ERROR": "Failed to push to DV360. Please reprocess the row.",
  "LOAD_FROM_DV360_ERROR": "Failed to load from DV360. Please reprocess the row.",
  // Ranges
  "LOGS_TAB_RANGE": "A2:C",
  "ERRORS_TAB_RANGE": "A2:C",
  "SDF_VERSION": "SDF_VERSION_5_2",
  "ERRORS_TAB_RANGE": "A2:C",
  // Default sleep in seconds to wait before retrying a retriable error
  "DEFAULT_SLEEP": 8 * 1000,
  // Default number of times to retry a retriable error
  "DEFAULT_RETRIES": 4,
  "RETRIABLE_ERROR_MESSAGES": [
      'failed while accessing document with id',
      'internal error',
      'user rate limit exceeded',
      'quota exceeded'
  ]
};
