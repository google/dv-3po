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

function budgetLoadTrigger() {
  checkExecutionTime();
  errorHandlerInvoke(() => {
    new BudgetSegmentService(getDVDAO()).load({
      'entity': 'Budget Segment',
      'incremental': true
    });

  }, () => {nextTrigger('budgetLoadTrigger');});
}

/**
 * Loads IO Budget Segment Data
 */
var BudgetSegmentService = function(dvDAO) {
  var that = this;

  BaseIncrementalService.call(this, dvDAO);

  this.LAST_LOAD_TIME_RANGE = constants.LAST_BUDGET_LOAD_RANGE;

  /**
   * Fetches all advertiser ids from the Advertisers tab
   *
   * returns: list of advertiser ids
   */
  function getAdvertiserIds() {
    var advertiserIds = [];
    var advertiserFeed = new FeedProvider(constants.ADVERTISERS_TAB).load();

    while(advertiser = advertiserFeed.next()) {
      var advertiserId = advertiser[constants.ADVERTISER_ID_HEADER];
      var partnerId = advertiser[constants.PARTNER_ID_HEADER];

      if(advertiserIds.indexOf(advertiserId) == -1) {
        advertiserIds.push({
          'advertiserId': advertiserId,
          'partnerId': partnerId
        });
      }
    }

    return advertiserIds;
  }

  /**
   * Formats the DV360 date representation object into a string in the format
   * YYYY-MM-DD
   *
   * params: d date in the DV360 object structure
   * returns: String with the formatted date
   */
  function formatDate(d) {
    return `${d.year}-${d.month}-${d.day}`
  }

  /**
   * Loads IO Budget segments in the Budget Segments tab for all advertiers in
   * the Advertisers tab
   *
   * params: job
   *  job.entity: Budget Segment
   *  job.incremental: True to load only what changed since the last execution
   *
   * returns: job
   */
  this.load = function(job) {
    // Read all advertisers from the Advertisers tab
    var advertiserIds = getAdvertiserIds();
    var filter = null;
    var runTime = new Date();
    var feed = [];
    var updatedIoIds = [];

    if(job.incremental) {
      // If incremental read last execution time
      var lastRunTime = dvDAO.formatDateFilter(this.getLastRunTime());

      if(lastRunTime) {
        console.log('incremental');
        filter = encodeURIComponent(`updateTime>="${lastRunTime}"`);
      } else {
        console.log('full reload');
      }
    } else {
      // If not incremental, clear the Budget Segments tab
      getSheetDAO().clear(constants.BUDGET_SEGMENTS_TAB, constants.BUDGET_SEGMENT_RANGE);
      checkExecutionTime();
    }

    advertiserIds.forEach(advertiserId => {

      // Fetch IOs
      var ios = dvDAO.listInsertionOrders(advertiserId.advertiserId, filter);
      checkExecutionTime();

      ios.forEach(io => {
        checkExecutionTime();
        updatedIoIds.push(String(io.insertionOrderId));

        // Map feed
        io.budget.budgetSegments.forEach(budgetSegment => {
          var feedItem = {};

          feedItem[constants.PARTNER_ID_HEADER] = advertiserId.partnerId;
          feedItem[constants.ADVERTISER_ID_HEADER] = advertiserId.advertiserId;
          feedItem[constants.INSERTION_ORDER_ID_HEADER] = io.insertionOrderId;
          feedItem[constants.BUDGET_TYPE_HEADER] = io.budget.budgetUnit;
          feedItem[constants.START_DATE_HEADER] = new Date(formatDate(budgetSegment.dateRange.startDate));
          feedItem[constants.END_DATE_HEADER] = new Date(formatDate(budgetSegment.dateRange.endDate));
          feedItem[constants.BUDGET_HEADER] = budgetSegment.budgetAmountMicros / 1000000;

          feed.push(feedItem);
        });
      });
    });

    var segmentsFeed = new FeedProvider(constants.BUDGET_SEGMENTS_TAB).load();

    while(segment = segmentsFeed.next()) {
      if(updatedIoIds.indexOf(String(segment[constants.INSERTION_ORDER_ID_HEADER])) == -1) {
        feed.push(segment);
      }
    }

    // Save feed
    new FeedProvider(constants.BUDGET_SEGMENTS_TAB).setFeed(feed).save();

    // Save last execution time
    this.setLastRunTime(runTime);

    return job;
  }

}
