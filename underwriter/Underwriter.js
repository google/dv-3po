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
    var feed = getSheetDAO().sheetToDict('Underwriter');
    var result = {};

    each(feed, function(feedItem, index) {
      var item = null;

      if(!result[feedItem['Advertiser ID']]) {
        item = {
          feed: [],
          ios: []
        };

        result[feedItem['Advertiser ID']] = item;
      } else {
        item = result[feedItem['Advertiser ID']];
      }

      if(!item.earliestStartDate ||
          item.earliestStartDate >
            feedItem['Credit Start Date']) {
        item.earliestStartDate =
            feedItem['Credit Start Date'];
      }

      item.feed.push(feedItem);

    });

    return result;
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
    var advertiserIds = Object.getOwnPropertyNames(feed);
    var filters = [];
    var result = [];

    each(advertiserIds, function(advertiserId, index) {
      filters.push({
        'advertiserId': advertiserId
      });
    });

    each(getDVManager().sdfGetIOs(filters), function(io, index) {
      var add = false;

      each(io['Parsed Segments'], function(segment, index) {

        if(segment['endDate'] >= feed[io['Advertiser ID']].earliestStartDate) {
          var matched = false;
          var advertiserTimezone = getDVManager().
              getAdvertiserTimezone(io['Advertiser ID']);

          each(feed[io['Advertiser ID']].feed, function(feedItem, index) {
            if(matched) {
              return;
            }

            if(between([segment['startDate'], segment['endDate']],
                  feedItem['Credit Start Date'], feedItem['Credit End Date'],
                  advertiserTimezone, true)) {
              matched = true;

              if(!feedItem.segments) {
                feedItem.segments = [];
              }

              feedItem.segments.push(segment);
            }
          });

          if(!matched) {
            if(!feed.unmatched) {
              feed.unmatched = [];
            }

            feed.unmatched.push(segment);
          }
        }
      });
    });
  }

  /**
   * Given the validation data, verifies what segments are out of bounds of
   * credit periods and generates error messages accordingly.
   *
   * params: validationData dictionary generated by the prepareData function
   *
   * returns: array of strings representing error messages
   */
  function verifyDateRanges(validationData) {
    var result = [];

    if(validationData.unmatched) {
      each(validationData.unmatched, function(segment, index) {
        result.push(["ERROR", "IO " + segment.ioId + " has a budget segment out of " +
            " bounds: " + formatDate(segment['startDate']) + " to " + formatDate(segment['endDate']) +
            " $" + segment['budget']]);
      });
    }

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

    return Utilities.formatDate(date, timeZone, 'yyyy-MM-dd');
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

    each(Object.getOwnPropertyNames(validationData), function(advertiserId, index) {
      each(validationData[advertiserId].feed, function(feedItem, index) {
        var budget = 0;

        if(feedItem.segments) {
          each(feedItem.segments, function(segment, index) {
            budget += segment.budget;
          });
        }

        if(budget > feedItem['Credit']) {
          result.push(['ERROR',
              'Scheduled budget exceeds credit limit for advertiser ' +
              feedItem['Advertiser ID'] + ' on credit period from ' +
              formatDate(feedItem['Credit Start Date']) +  ' to ' +
              formatDate(feedItem['Credit End Date']) +
              ' credit: $' + feedItem['Credit'].toFixed(2) + ' scheduled budget: $' +
              budget.toFixed(2)]);
        }
      });
    });

    return result;
  }

  /**
   * Main entry point for performing underwriter validations
   */
  this.validate = function() {
    getSheetDAO().goToTab('Validation');
    getSheetDAO().clear('Validation', "A1:B");

    var feed = readFeed();

    prepareData(feed);

    var logMessages = [];

    var dateErrors = verifyDateRanges(feed);
    var budgetErrors = verifyBudgets(feed);

    logMessages = logMessages.concat(dateErrors);
    logMessages = logMessages.concat(budgetErrors);

    logMessages = [
        ['', 'Executed on: ' + new Date()],
        ['SUMMARY', dateErrors.length + " date errors, and " + budgetErrors.length + " budget errors found"]
    ];

    logMessages = logMessages.concat(dateErrors).concat(budgetErrors);

    getSheetDAO().setValues('Validation', "A1:B" + logMessages.length, logMessages);
  }
}
