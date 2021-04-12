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
  // Tabs and ranges
  "UNDERWRITER_TAB": "Underwriter",
  "VALIDATION_TAB": "Validation",
  "VALIDATION_TAB_RANGE": "A1:B",
  "REPORT_CLEAR_RANGE": "A1:AZ",

  // Entities
  "REPORT_ENTITY": 'Reports',

  // Sheet Headers
  "ADVERTISER_ID_HEADER": "Advertiser ID",
  "CREDIT_START_DATE_HEADER": "Credit Start Date",
  "CREDIT_END_DATE_HEADER": "Credit End Date",
  "CREDIT_HEADER": "Credit",
  "REPORT_ID_HEADER": "Report ID",
  "TARGET_TAB_HEADER": "Target Tab",
  "RUN_AT_HEADER": "Run At",
  "TRIGGER_ID_HEADER": "Trigger ID",

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
  "SDF_VERSION": "SDF_VERSION_5_2",
  "IO_ID_SDF": "Io Id",
  "BUDGET_SEGMENTS_SDF": "Budget Segments",
  "ADVERTISER_ID_SDF": "Advertiser ID",

  // Logging and formatting
  "DATE_FORMAT": "yyyy-MM-dd",
  "LOG_LEVEL_ERROR": "ERROR",
  "LOG_LEVEL_SUMMARY": "SUMMARY",

  // Endpoints
  "BASE_API_URL": "https://displayvideo.googleapis.com/v1",
  "CONTENT_API_URL": "https://displayvideo.googleapis.com/download/",
  "REPORTING_API_URL": "https://www.googleapis.com/doubleclickbidmanager/v1.1",
  "ENDPOINT_SDF_DOWNLOAD": "/sdfdownloadtasks/",

  // HTTP Headers
  "AUTHORIZATION_HEADER": "Authorization",
  "CONTENT_TYPE_HEADER": "Content-Type",
  "CONTENT_TYPE_JSON": "application/json",
  "CONTENT_TYPE_ZIP": "application/zip",
  "ENDPOINT_ADVERTISER": "/advertisers/",
  "ENDPOINT_LINE_ITEM": "/lineItems/",
  "ENDPOINT_INSERTION_ORDER": "/insertionOrders/",

  // Triggers
  "PULL_REPORT_TRIGGER_FUNCTION": "pullReportTrigger"
};
