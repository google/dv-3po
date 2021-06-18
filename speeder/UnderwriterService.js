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
 * List of triggers to be executed for underwriter, these are function names and
 * each function can trigger the next by calling nextTrigger
 */
var underwriterTriggerChain = [
  'preProcessTrigger', 'advertiserLoadTrigger', 'budgetLoadTrigger',
  'validateTrigger', 'postProcessTrigger'
];

var defaultAdvertiserTimezone = null;

/**
 * Returns the default advertiser timezone from the config tab
 *
 * returns: String representing the default advertiser timezone.
 *
 */
function getDefaultAdvertiserTimezone() {
  if (!defaultAdvertiserTimezone) {
    var defaultAdvertiserTimezone = getSheetDAO().getValue(
        constants.CONFIG_TAB, constants.DEFAULT_ADVERTISER_TIMEZONE_RANGE);
  }

  return defaultAdvertiserTimezone;
}

/**
 * Pre processing for the underwriter trigger chain
 */
function preProcessTrigger() {
  errorHandlerInvoke(
      () => {
        if (PropertiesService.getDocumentProperties().getProperty(
                constants.FULL_RELOAD_PROP) === 'true') {
          PropertiesService.getDocumentProperties().setProperty(
              constants.FULL_RELOAD_PROP, false);
          new AdvertiserService(getDVDAO()).setupFullReload();
          new BudgetSegmentService(getDVDAO()).setupFullReload();
          console.log('full reload');
        } else {
          console.log('incremental');
        }
      },
      () => {
        nextTrigger('preProcessTrigger');
      });
}

/**
 * Funcntion to be invoked as an apps script trigger to perform validation
 */
function validateTrigger() {
  checkExecutionTime();
  errorHandlerInvoke(
      () => {
        new UnderwriterService(getDVDAO()).load({'entity': 'Underwriter'});
      },
      () => {
        nextTrigger('validateTrigger');
      });
}

/**
 * Triggers the next function of the trigger chain based on the function name of
 * the last executed function.
 *
 * params: functionName string with the name of the function in the
 * underwriterTriggerChain
 */
function nextTrigger(functionName) {
  var functionIndex = underwriterTriggerChain.indexOf(functionName);

  if (functionIndex != -1 &&
      ((functionIndex + 1) < underwriterTriggerChain.length)) {
    ScriptApp.newTrigger(underwriterTriggerChain[functionIndex + 1])
        .timeBased()
        .after(1)
        .create();
  }
}

/**
 * Post process trigger that performs clean ups such as removing scheduled
 * downstream triggers
 */
function postProcessTrigger() {
  errorHandlerInvoke(() => {
    downstreamTriggers = underwriterTriggerChain.slice(1);

    ScriptApp.getProjectTriggers().forEach(trigger => {
      if (downstreamTriggers.indexOf(trigger.getHandlerFunction()) != -1) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
  });
}

/**
 * Sets up the underwriter trigger to run every 5 minutes
 */
function doSetupUnderwriterTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger(underwriterTriggerChain[0])
      .timeBased()
      .everyMinutes(5)
      .create();
}

/**
 * Underwriter validates flights and budgets to limit exposure of sequential
 * liability
 */
var UnderwriterService = function(dvDAO) {
  BaseService.call(this, dvDAO);

  var _advertiserMap = null;

  /**
   * Loads the advertiser map, maintains a singleton for the map so it is not
   * loaded multiple times
   *
   * returns: advertiser map
   */
  function getAdvertiserMap() {
    if (!_advertiserMap) {
      // Create Advertiser map to simplify lookup of advertiser settings
      _advertiserMap = {};
      var advertiserFeed = new FeedProvider(constants.ADVERTISERS_TAB).load();

      while (advertiser = advertiserFeed.next()) {
        _advertiserMap[new String(advertiser[constants.ADVERTISER_ID_HEADER])] =
            advertiser;
      }
    }

    return _advertiserMap;
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

    if (typeof (date) === 'string') {
      date = new Date(date);
    }

    return Utilities.formatDate(date, timeZone, constants.DATE_FORMAT);
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
    if (Array.isArray(dates)) {
      var result = true;
      dates.forEach(function(date) {
        if (!between(date, start, end, timeZone, ignoreTime)) {
          result = false;
        }
      });

      return result;
    } else {
      if (ignoreTime) {
        dates = formatDate(dates, timeZone);
        start = formatDate(start, timeZone);
        end = formatDate(end, timeZone);
      }
      return start <= dates && dates <= end;
    }
  }

  /**
   * Parses through the underwriter segments in the Underwriter tab and
   * organizes the data to simplify validation
   *
   * returns: list of objects representing the data in the Underwriter tab
   */
  function parseUnderwriterSegments() {
    var result = [];
    var underwriterFeed = new FeedProvider(constants.UNDERWRITER_TAB).load();

    while (feedItem = underwriterFeed.next()) {
      var segment = {};

      feedItem[constants.CREDIT_START_DATE_HEADER] =
          new Date(feedItem[constants.CREDIT_START_DATE_HEADER]);
      feedItem[constants.CREDIT_END_DATE_HEADER] =
          new Date(feedItem[constants.CREDIT_END_DATE_HEADER]);

      segment.feedItem = feedItem;
      segment.advertiserIds = [];

      if (!feedItem[constants.PARTNER_ID_HEADER] &&
          !feedItem[constants.ADVERTISER_ID_HEADER]) {
        // Neither partner nor advertiser IDs were provided, so this segment is
        // invalid
        segment.invalid = true;
      } else {
        if (feedItem[constants.ADVERTISER_ID_HEADER]) {
          // Advertiser ID is not blank, so add all advertiser ids to the
          // advertiserIds field

          String(feedItem[constants.ADVERTISER_ID_HEADER])
              .split(',')
              .forEach(advertiserId => {
                segment.advertiserIds.push(String(advertiserId).trim());
              });
        } else if (
            feedItem[constants.PARTNER_ID_HEADER] &&
            !feedItem[constants.ADVERTISER_ID_HEADER]) {
          // If Advertiser ID is blank, add all advertisers under the partner
          var advertiserFeed =
              new FeedProvider(constants.ADVERTISERS_TAB).load();
          var partnerId = String(feedItem[constants.PARTNER_ID_HEADER]).trim();

          while (advertiser = advertiserFeed.next()) {
            if (advertiser[constants.PARTNER_ID_HEADER] == partnerId) {
              segment.advertiserIds.push(
                  advertiser[constants.ADVERTISER_ID_HEADER]);
            }
          }
        }

        if (feedItem[constants.PARTNER_ID_HEADER] &&
            feedItem[constants.ADVERTISER_ID_HEADER]) {
          // If both Partner and Advertiser IDs are provided, add all unmatched
          // advertiser ids to the unmatchedAdvertisers for coverage validation

          var advertiserFeed =
              new FeedProvider(constants.ADVERTISERS_TAB).load();

          segment.unmatchedAdvertiserIds = [];
          while (advertiser = advertiserFeed.next()) {
            var advertiserId =
                String(advertiser[constants.ADVERTISER_ID_HEADER]);

            if (segment.advertiserIds.indexOf(advertiserId) == -1) {
              segment.unmatchedAdvertiserIds.push(advertiserId);
            }
          }
        }
      }

      result.push(segment);
    }

    return result;
  }

  /**
   * Reads all budget segments from the Budget Segments tab, and matches each of
   * the relevant ones (e.g. end date < earliest credit segment start date) to
   * its respective credit segment
   *
   * params: creditSegments list of parsed credit segments from the
   * parseUnderwriterSegments function, this is updated directly.
   *
   * returns: List of unmatched budget segments
   */
  function matchBudgetSegmentsToCreditSegments(creditSegments) {
    var budgetSegmentFeed =
        new FeedProvider(constants.BUDGET_SEGMENTS_TAB).load();
    var earliestStartDate = new Date();
    var unmatchedBudgetSegments = [];

    var advertiserMap = getAdvertiserMap();

    // Determine the earliest start date of all credit segments and prepare
    // additional fields of the credit segment objects
    creditSegments.forEach(creditSegment => {
      if (creditSegment.feedItem[constants.CREDIT_START_DATE_HEADER] <
          earliestStartDate) {
        earliestStartDate =
            creditSegment.feedItem[constants.CREDIT_START_DATE_HEADER];
      }

      creditSegment.matchedBudgetSegments = [];
    });

    while (budgetSegment = budgetSegmentFeed.next()) {
      budgetSegment[constants.START_DATE_HEADER] =
          new Date(budgetSegment[constants.START_DATE_HEADER]);
      budgetSegment[constants.END_DATE_HEADER] =
          new Date(budgetSegment[constants.END_DATE_HEADER]);

      if (budgetSegment[constants.END_DATE_HEADER] >= earliestStartDate) {
        // If the budget segment is within the date rage for validation

        var matched = false;
        creditSegments.forEach(creditSegment => {
          // If contains the advertiser

          if (creditSegment.advertiserIds.indexOf(String(
                  budgetSegment[constants.ADVERTISER_ID_HEADER])) != -1) {
            budgetSegment[constants.EMAILS_HEADER] =
                creditSegment.feedItem[constants.EMAILS_HEADER];

            budgetSegment.advertiserId =
                creditSegment.feedItem[constants.ADVERTISER_ID_HEADER];
            budgetSegment.partnerId =
                creditSegment.feedItem[constants.PARTNER_ID_HEADER];

            if (between(
                    [
                      budgetSegment[constants.START_DATE_HEADER],
                      budgetSegment[constants.END_DATE_HEADER]
                    ],
                    creditSegment.feedItem[constants.CREDIT_START_DATE_HEADER],
                    creditSegment.feedItem[constants.CREDIT_END_DATE_HEADER],
                    advertiserMap[budgetSegment[constants.ADVERTISER_ID_HEADER]]
                                 [constants.TIMEZONE_HEADER],
                    true)) {
              // If budget segment date range is whithin credit segment date
              // range

              creditSegment.matchedBudgetSegments.push(budgetSegment);
              matched = true;
            }
          }
        });

        if (!matched) {
          unmatchedBudgetSegments.push(budgetSegment);
        }
      }
    }

    return unmatchedBudgetSegments;
  }

  /**
   * Loads spend from the Spend tab and matches it with credit segments. A new
   * field "spend" is added to the matching credit segment.
   *
   * params: creditSegments list of parsed credit segments from the
   *   parseUnderwriterSegments function, this is updated directly.
   *
   * returns: creditSegments passed in as parameter
   */
  function matchSpendToCreditSegments(creditSegments) {
    var spendFeed = new FeedProvider(constants.SPEND_TAB).load();
    var feedItem = null;
    var advertiserMap = getAdvertiserMap();

    creditSegments.forEach(creditSegment => {
      creditSegment.spend = [];
      creditSegment.totalSpend = 0;
    });

    while (feedItem = spendFeed.next()) {
      var spendDate = new Date(feedItem[constants.DATE_HEADER]);

      creditSegments.forEach(creditSegment => {
        var timeZone =
            advertiserMap[creditSegment
                              .feedItem[constants.ADVERTISER_ID_HEADER]] ?
            advertiserMap[creditSegment.feedItem
                              [constants
                                   .ADVERTISER_ID_HEADER]][constants
                                                               .TIMEZONE_HEADER] :
            getDefaultAdvertiserTimezone();

        if ((creditSegment.advertiserIds.indexOf(
                 String(feedItem[constants.ADVERTISER_ID_HEADER])) != -1) &&
            between(
                [spendDate],
                creditSegment.feedItem[constants.CREDIT_START_DATE_HEADER],
                creditSegment.feedItem[constants.CREDIT_END_DATE_HEADER],
                timeZone, true)) {
          creditSegment.spend.push(feedItem);
          creditSegment.totalSpend += feedItem[constants.REVENUE_HEADER];
        }
      });
    }

    return creditSegments
  }

  /**
   * Adds a new error to the list of messages
   *
   * params:
   *  messages: Map keyed by recipients with objects with error messages
   *  recipients: Recipient list
   *  errorType: Type of the error
   *  errorMessage: Error message
   */
  function addError(
      messages, recipients, errorType, errorMessage, partnerId, advertiserId) {
    if (!messages[recipients]) {
      messages[recipients] = {
        'partnerId': partnerId,
        'advertiserId': advertiserId
      };
    }

    if (!messages[recipients][errorType]) {
      messages[recipients][errorType] = [];
    }

    messages[recipients][errorType].push(errorMessage);
  }

  /**
   * Performs the underwriter validation and loads data into the Validation tab
   *
   * params: the job object
   *  job.entity: Underwriter
   */
  this.load = function(job) {
    // Load credit segments
    var creditSegments = parseUnderwriterSegments();
    checkExecutionTime();
    var messages = {};

    // Match budgets segments with credit segments
    var unmatchedBudgetSegments =
        matchBudgetSegmentsToCreditSegments(creditSegments);
    checkExecutionTime();

    // Match spend to credit segments
    matchSpendToCreditSegments(creditSegments);
    checkExecutionTime();

    // Validate dates and generate date error messages
    unmatchedBudgetSegments.forEach(segment => {
      addError(
          messages, segment[constants.EMAILS_HEADER],
          constants.ERROR_TYPE_DATES,
          `Insertion Order ${segment[constants.INSERTION_ORDER_ID_HEADER]}` +
              ` has budget segments not fully covered by credit segments`,
          segment.partnerId, segment.advertiserId);
    });

    creditSegments.forEach(creditSegment => {
      checkExecutionTime();
      var totalBudget = 0;

      // Validate total budgets and generate budget error messages
      creditSegment.matchedBudgetSegments.forEach(segment => {
        totalBudget += segment[constants.BUDGET_HEADER];
        if (segment[constants.BUDGET_TYPE_HEADER] != 'BUDGET_UNIT_CURRENCY') {
          addError(
              messages,
              creditSegment.feedItem[constants.EMAILS_HEADER],
              constants.ERROR_TYPE_BUDGET_TYPE,
              `${creditSegment.feedItem[constants.PARTNER_ID_HEADER]} ${
                  creditSegment.feedItem[constants.ADVERTISER_ID_HEADER]}` +
                  ` invalid budget type for io ${
                      segment[constants.INSERTION_ORDER_ID_HEADER]}`,
              creditSegment.feedItem[constants.PARTNER_ID_HEADER],
              creditSegment.feedItem[constants.ADVERTISER_ID_HEADER],
          );
        }
      });

      if (totalBudget > creditSegment.feedItem[constants.CREDIT_HEADER]) {
        addError(
            messages,
            creditSegment.feedItem[constants.EMAILS_HEADER],
            constants.ERROR_TYPE_BUDGET,
            `${creditSegment.feedItem[constants.PARTNER_ID_HEADER]} ${
                creditSegment.feedItem[constants.ADVERTISER_ID_HEADER]}` +
                ` scheduled budgets ($${totalBudget}) exceeds credit ($${
                    creditSegment.feedItem[constants.CREDIT_HEADER]})`,
            creditSegment.feedItem[constants.PARTNER_ID_HEADER],
            creditSegment.feedItem[constants.ADVERTISER_ID_HEADER],
        );
      }

      // Validate spend and generate spend error messages
      if (creditSegment.totalSpend >
          creditSegment.feedItem[constants.CREDIT_HEADER]) {
        addError(
            messages,
            creditSegment.feedItem[constants.EMAILS_HEADER],
            constants.ERROR_TYPE_SPEND,
            `${creditSegment.feedItem[constants.PARTNER_ID_HEADER]} ${
                creditSegment.feedItem[constants.ADVERTISER_ID_HEADER]}` +
                ` spend ($${creditSegment.totalSpend}) exceeds credit ($${
                    creditSegment.feedItem[constants.CREDIT_HEADER]})`,
            creditSegment.feedItem[constants.PARTNER_ID_HEADER],
            creditSegment.feedItem[constants.ADVERTISER_ID_HEADER],
        );
      }

      // Validate advertiser coverage
      if (creditSegment.unmatchedAdvertiserIds) {
        addError(
            messages, creditSegment.feedItem[constants.EMAILS_HEADER],
            constants.ERROR_TYPE_ADVERTISER_COVERAGE,
            `Advertisers: ${
                creditSegment.unmatchedAdvertiserIds.join(
                    ', ')} not covered by a credit segment.`,
            creditSegment.feedItem[constants.PARTNER_ID_HEADER])
      }
    });

    // Send email notifications
    // Send error notifications

    var emailService = new EmailService();

    Object.getOwnPropertyNames(messages).forEach(emails => {
      var message = messages[emails];
      var partnerId = message.partnerId;
      var advertiserId = message.advertiserId;

      delete message.partnerId;
      delete message.advertiserId;

      if (emails) {
        emailService.sendEmail(partnerId, advertiserId, message, emails);
      }
    });

    return job
  }
}
