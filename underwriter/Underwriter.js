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
 * Contains core functionality for the Underwirter application, handles
 * validation rules, high level interaction with DV360, processing of
 * configurations from the sheet, and alerts.
 */
var Underwriter = function() {

  /**
   * Reads the budget configuration feed from the "Underwriter" tab of the sheet
   * and organizes the feed by Advertiser with respective budget segments for
   * validation
   *
   * returns: Dictionary keyed by Advertiser ID with value of a list of budget
   * segments for that advertiser. Each item in the list has credit, start date,
   * and end date fields.
   */
  function readFeed() {
    return getSheetDAO().sheetToDict(constants.UNDERWRITER_TAB);
  }

  /**
   * Checks if one or more dates are between a start and end date.
   *
   * params:
   *   dates: date or list of dates
   *   start: start date
   *   end: end date
   *   timeZone: timezone to use for comparing dates, optiona, if not provided
   *   sheet timezone is used
   *   ignoreTime: boolean, whether to only compare the date portion of the
   *   dates
   *
   * returns: true if all dates in the dates list are >= than start and <= end
   */
  function between(dates, start, end, timeZone, ignoreTime) {
    if(Array.isArray(dates)) {
      var result = true;
      each(dates, function(date, index) {
        if(!between(date, start, end, timeZone, ignoreTime)) {
          result = false;
        }
      });

      return result;
    } else {
      if(ignoreTime) {
        dates = formatDate(dates, timeZone);
        start = formatDate(start, timeZone);
        end = formatDate(end, timeZone);
      }
      return start <= dates && dates <= end;
    }
  }

  /**
   * Given the feed in the sheet, prepares the data for validation by fetching
   * relevant insertion orders from DV360, parsing budget segments, and
   * organizing in a way to facilitate the validation.
   *
   * params:
   *   advertiserId: Integer, Advertiser ID
   *   feed: Feed for this advertiser from the Underwriter tab, this is changed
   *   directly.
   *
   */
  function prepareData(feed) {
    var earliestStartDate = {};
    var advertiserIds = [];
    var filters = [];
    var unmatchedSegments = [];

    feed.forEach(feedItem => {
      var ids = typeof(feedItem[constants.ADVERTISER_ID_HEADER]) == 'string' ?
          feedItem[constants.ADVERTISER_ID_HEADER].split(',') : [feedItem[constants.ADVERTISER_ID_HEADER]]

      ids.forEach(advertiserId => {
        advertiserId = Number(advertiserId);

        if(earliestStartDate[advertiserId] ||
            earliestStartDate[advertiserId] > feedItem[constants.CREDIT_START_DATE]) {
          earliestStartDate[advertiserId] = feedItem[constants.CREDIT_START_DATE_HEADER];
        }

        if(advertiserIds.indexOf(advertiserId) == -1) {
          advertiserIds.push(advertiserId)
        }
      });
    });

    if(advertiserIds.length == 0) {
      return;
    }

    advertiserIds.forEach(advertiserId => {
      filters.push({'advertiserId': advertiserId});
    });

    getDVManager().sdfGetIOs(filters).forEach(io => {
      var advertiserTimezone = getDVManager().
          getAdvertiserTimezone(io[constants.ADVERTISER_ID_HEADER]);

      io[constants.PARSED_SEGMENTS_FIELD].forEach(segment => {
        // Ignore segments before earliest start date
        if(earliestStartDate[io[constants.ADVERTISER_ID_HEADER]] > segment[constants.END_DATE_API]) {
          return;
        }

        var matched = false;

        feed.forEach(feedItem => {
          var ids = typeof(feedItem[constants.ADVERTISER_ID_HEADER]) == 'string' ?
              feedItem[constants.ADVERTISER_ID_HEADER].split(',') : [Number(feedItem[constants.ADVERTISER_ID_HEADER])];

          if(ids.indexOf(io[constants.ADVERTISER_ID_HEADER]) != -1) {
            if(between([segment[constants.START_DATE_API], segment[constants.END_DATE_API]],
                  feedItem[constants.CREDIT_START_DATE_HEADER], feedItem[constants.CREDIT_END_DATE_HEADER],
                  advertiserTimezone, true)) {
              matched = true;

              if(!feedItem.segments) {
                feedItem.segments = [];
                feedItem.totalBudget = 0;
              }

              feedItem.segments.push(segment);
              feedItem.totalBudget += segment[constants.BUDGET_API];
            }
          }
        });

        if(!matched) {
          unmatchedSegments.push(segment);
        }
      });
    });

    return unmatchedSegments;
  }

  /**
   * Given the validation data, verifies what segments are out of bounds of
   * credit periods and generates error messages accordingly.
   *
   * params: validationData dictionary generated by the prepareData function
   *
   * returns: array of strings representing error messages
   */
  function verifyDateRanges(unmatchedSegments) {
    var result = [];

    unmatchedSegments.forEach(segment => {
      result.push(["ERROR", "IO " + segment.ioId + " has a budget segment out of " +
          " bounds: " + formatDate(segment[constants.START_DATE_API]) + " to " + formatDate(segment[constants.END_DATE_API]) +
          " $" + segment[constants.BUDGET_API]]);
    });

    return result;
  }

  /**
   * Formats a date in the format of the tool
   *
   * params:
   *  date: object to be formatted
   *  timeZone: timezone to use for formatting, optional, if not provided sheet
   *  timezone is used
   *
   * returns: string representation of the date
   */
  function formatDate(date, timeZone) {
    timeZone = timeZone || SpreadsheetApp.getActive().getSpreadsheetTimeZone();

    if(typeof(date) == "string") {
      date = new Date(date);
    }

    return Utilities.formatDate(date, timeZone, constants.DATE_FORMAT);
  }

  /**
   * Given the validation data, verifies that all aggregated budgets are less
   * than or equal to the total amount of the credit period.
   *
   * params: validationData dictionary generated by the prepareData function
   *
   * returns: array of strings representing error messages
   */
  function verifyBudgets(validationData) {
    var result = [];

    validationData.forEach(feedItem => {
      if(feedItem.totalBudget > feedItem[constants.CREDIT_HEADER]) {
        result.push([constants.LOG_LEVEL_ERROR,
            'Scheduled budget exceeds credit limit for advertiser ' +
            feedItem[constants.ADVERTISER_ID_HEADER] + ' on credit period from ' +
            formatDate(feedItem[constants.CREDIT_START_DATE_HEADER]) +  ' to ' +
            formatDate(feedItem[constants.CREDIT_END_DATE_HEADER]) +
            ' credit: $' + feedItem[constants.CREDIT_HEADER].toFixed(2) + ' scheduled budget: $' +
            feedItem.totalBudget.toFixed(2)]);
      }
    });

    return result;
  }

  /**
   * Main entry point for performing underwriter validations
   */
  this.validate = function() {
    getSheetDAO().goToTab(constants.VALIDATION_TAB);
    getSheetDAO().clear(constants.VALIDATION_TAB, constants.VALIDATION_TAB_RANGE);

    var feed = readFeed();

    var unmatchedSegments = prepareData(feed);

    var logMessages = [];

    var dateErrors = verifyDateRanges(unmatchedSegments);

    var budgetErrors = verifyBudgets(feed);

    logMessages = logMessages.concat(dateErrors);
    logMessages = logMessages.concat(budgetErrors);

    logMessages = [
        ['', 'Executed on: ' + new Date()],
        [constants.LOG_LEVEL_SUMMARY, dateErrors.length + " date errors, and " + budgetErrors.length + " budget errors found"]
    ];

    logMessages = logMessages.concat(dateErrors).concat(budgetErrors);

    getSheetDAO().setValues(constants.VALIDATION_TAB,
        constants.VALIDATION_TAB_RANGE + logMessages.length, logMessages);
  }
}
