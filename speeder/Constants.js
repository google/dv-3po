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
  // Endpoints
  "BASE_API_URL": "https://displayvideo.googleapis.com/v1",
  "CONTENT_API_URL": "https://displayvideo.googleapis.com/download/",
  "REPORTING_API_URL": "https://www.googleapis.com/doubleclickbidmanager/v1.1",
  "ENDPOINT_SDF_DOWNLOAD": "/sdfdownloadtasks/",
  "ENDPOINT_ADVERTISER": "/advertisers/",
  "ENDPOINT_LINE_ITEM": "/lineItems/",
  "ENDPOINT_INSERTION_ORDER": "/insertionOrders/",

  // Field names
  "REPORT_ID_HEADER": "Report ID",
  "TARGET_TAB_HEADER": "Target Tab",
  "RUN_AT_HEADER": "Run At",
  "TRIGGER_ID_HEADER": "Trigger ID",
  "LINE_ITEM_ID_HEADER" : "Line Item ID",
  "LINE_ITEM_NAME_HEADER": "Line Item Name",
  "PARTNER_ID_HEADER": 'Partner ID',
  "ADVERTISER_ID_HEADER": 'Advertiser ID',
  "DATE_HEADER": "Date",
  "REVENUE_HEADER": "Revenue (Adv Currency)",
  "ADVERTISER_NAME_HEADER": 'Advertiser Name',
  "TIMEZONE_HEADER": "Timezone",
  "INSERTION_ORDER_ID_HEADER": "Insertion Order ID",
  "INSERTION_ORDER_NAME_HEADER": "Insertion Order Name",
  "BUDGET_TYPE_HEADER": "Budget Type",
  "START_DATE_HEADER": "Start Date",
  "END_DATE_HEADER": "End Date",
  "BUDGET_HEADER": "Budget",
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
  "BUDGET_TYPE_HEADER": "Budget Type",
  "TRACKING_AD_NAME_HEADER": "Tracking Ad Name",
  "CREATIVE_NAME_HEADER": "Tracking Creative Name",
  "TRACKING_PLACEMENT_ID_HEADER": "Tracking Placement ID",
  "TRACKING_AD_ID_HEADER": "Tracking Ad ID",
  "TRACKING_CREATIVE_ID_HEADER": "Tracking Creative ID",
  "CREDIT_START_DATE_HEADER": "Credit Start Date",
  "CREDIT_HEADER": "Credit",
  "CREDIT_END_DATE_HEADER": "Credit End Date",
  "EMAILS_HEADER": "Emails",
  "ERROR_TYPE_DATES": "dates",
  "ERROR_TYPE_BUDGET": "budget",
  "ERROR_TYPE_ADVERTISER_COVERAGE": "coverage",
  "ERROR_TYPE_BUDGET_TYPE": "budget type",
  "ERROR_TYPE_SPEND": "spend",
  "EMAIL_SUBJECT_HEADER": "Email Subject",
  "EMAIL_BODY_HEADER": "Email Body",
  "VIDEO_HEADER": "YouTube Video",

  // Properties
  "FULL_RELOAD_PROP": "fullReload",

  // Status
  "STATUS_UNCHANGED" : "UNCHANGED",
  "STATUS_MODIFIED" : `%s MODIFIED`,
  "STATUS_LOADED": "LOADED",

  // Tab Names
  "UNDERWRITER_TAB": "Underwriter",
  "SPEND_TAB": "Spend",
  "LI_KEYWORD_INCLUSIONS_TAB_NAME" : "Line Items For Keyword Inclusions",
  "LI_KEYWORD_EXCLUSIONS_TAB_NAME" : "Line Items For Keyword Exclusions",
  "LI_SENSITIVE_CATEGORY_EXCLUSIONS_TAB_NAME" : "Line Items For Sensitive Category Exclusions",
  "BS_CONFIG_TAB_NAME": "BS Config",
  "QA_TAB_NAME": "QA",
  "LOGS_TAB_NAME": "Log",
  "ERRORS_TAB_NAME": "Errors",
  "ADVERTISERS_TAB": "Advertisers",
  "BUDGET_SEGMENTS_TAB": "Budget Segments",
  "CONFIG_TAB": "Config",
  "TEMPLATE_TAB": "Template",

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
  "REPORT_CLEAR_RANGE": "A1:AZ",
  "LOGS_TAB_RANGE": "A2:C",
  "VALIDATION_TAB_RANGE": "A1:B",
  "SDF_VERSION": "SDF_VERSION_5_2",
  "ERRORS_TAB_RANGE": "A2:C",
  "ADVERTISER_RANGE": "A2:AZ",
  "BUDGET_SEGMENT_RANGE": "A2:AZ",
  "ADMIN_EMAIL_RANGE": "B4",
  "LAST_ADVERTISER_LOAD_RANGE": "B2",
  "LAST_BUDGET_LOAD_RANGE": "B3",
  "DEFAULT_ADVERTISER_TIMEZONE_RANGE": "B5",

  // Default sleep in seconds to wait before retrying a retriable error
  "DEFAULT_SLEEP": 8 * 1000,

  // Default number of times to retry a retriable error
  "DEFAULT_RETRIES": 4,
  "RETRIABLE_ERROR_MESSAGES": [
      'failed while accessing document with id',
      'internal error',
      'user rate limit exceeded',
      'quota exceeded'
  ],

  // Triggers
  "PULL_REPORT_TRIGGER_FUNCTION": "pullReportTrigger",

  // Entities
  "REPORT_ENTITY": 'Reports',

  // Internal fields
  "PARSED_SEGMENTS_FIELD": "Parsed Segments",

  // API fields
  "ADVERTISER_ID_API": "advertiserId",
  "END_DATE_API": "endDate",
  "START_DATE_API": "startDate",
  "BUDGET_API": "budget",
  "IO_ID_API": "ioId",
  "CAMPAIGN_ID_API": "campaignId",
  "IO_IDS_API": "insertionOrderIds",
  "FILTER_API": "filter",
  "PAGE_TOKEN_API": "pageToken",
  "ALT_PARAM": "?alt=media",

  // SDF Fields
  "IO_ID_SDF": "Io Id",
  "BUDGET_SEGMENTS_SDF": "Budget Segments",
  "ADVERTISER_ID_SDF": "Advertiser ID",

  // Logging and formatting
  "DATE_FORMAT": "yyyy-MM-dd",
  "LOG_LEVEL_ERROR": "ERROR",
  "LOG_LEVEL_SUMMARY": "SUMMARY",

  // HTTP Headers
  "AUTHORIZATION_HEADER": "Authorization",
  "CONTENT_TYPE_HEADER": "Content-Type",
  "CONTENT_TYPE_JSON": "application/json",
  "CONTENT_TYPE_ZIP": "application/zip",

  // Execution time
  "MAX_EXECUTION_TIME": 270
};
