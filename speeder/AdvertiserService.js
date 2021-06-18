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
 * Funcntion to be invoked as an apps script trigger to load advertisers
 */
function advertiserLoadTrigger() {
  checkExecutionTime();
  errorHandlerInvoke(() => {
    new AdvertiserService(getDVDAO()).load({
      'entity': 'Advertiser',
      'incremental': true
    });

  }, () => {nextTrigger('advertiserLoadTrigger');});
}

/**
 * Loads Advertiser Data
 */
var AdvertiserService = function(dvDAO) {
  var that = this;

  BaseIncrementalService.call(this, dvDAO);

  this.LAST_LOAD_TIME_RANGE = constants.LAST_ADVERTISER_LOAD_RANGE;

  /**
   * Fetches all advertisers identified by the ids object returned by
   * identifyAdvertisersToLoad() and creates a map which is returned
   *
   * params: ids object returned by identifyAdvertisersToLoad
   *
   * returns: Map keyed by advertiser ID with the respective advertisers
   */
  function fetchAdvertisers(ids, filter) {
    var advertiserMap = {};

    ids.partnerIds.forEach(partnerId => {
      var advertisers = dvDAO.listAdvertisers(partnerId, filter);

      advertisers.forEach(advertiser => {
        advertiserMap[advertiser.advertiserId] = advertiser;
      });

    });

    ids.advertiserIds.forEach(advertiserId => {
      if(!advertiserMap[advertiserId]) {
        advertiserMap[advertiserId] = dvDAO.getAdvertiser(advertiserId);
      }
    });

    return advertiserMap;
  }

  /**
   * Reads the Underwriter tab and determines which advertisers need to be
   * loaded into the Advertisers tab
   *
   * returns: Object with list of partner ids under partnerIds and list of
   * advertiser ids under advertiserIds
   */
  function identifyAdvertiserIdsToLoad() {
    var result = {
      'partnerIds': [],
      'advertiserIds': []

    }

    var feed = new FeedProvider(constants.UNDERWRITER_TAB).load();

    while(feedItem = feed.next()) {
      if(feedItem[constants.PARTNER_ID_HEADER]) {
        that.addUnique(result.partnerIds, feedItem[constants.PARTNER_ID_HEADER]);
      } else if(feedItem[constants.ADVERTISER_ID_HEADER]) {
        String(feedItem[constants.ADVERTISER_ID_HEADER]).split(',').forEach(advertiserId => {
          advertiserId = advertiserId.trim();
          that.addUnique(result.advertiserIds, advertiserId);
        })
      }
    }

    return result;
  }

  /**
   * Creates a new feed item based on DV360 API advertiser data
   *
   * params: advertiser object returned from the API
   *
   * returns: Feed item populated with advertiser data
   */
  function newFeedItem(advertiser) {
    var feedItem = {};

    feedItem[constants.PARTNER_ID_HEADER] = advertiser.partnerId;
    feedItem[constants.ADVERTISER_ID_HEADER] = advertiser.advertiserId;
    feedItem[constants.ADVERTISER_NAME_HEADER] = advertiser.displayName;
    if(advertiser.generalConfig) {
      feedItem[constants.TIMEZONE_HEADER] = advertiser.generalConfig.timeZone;
    }

    return feedItem;
  }

  /**
   * Loads the advertiser tab
   *
   * params:
   *  job.entity string: 'Advertisers'
   *  job.incremental: Boolean whether should fetch only advertisers that
   *   changed since the last run
   *
   * returns job
   */
  this.load = function(job) {
    var ids = identifyAdvertiserIdsToLoad();
    var feed = [];
    var filter = null;
    var runTime = new Date();

    if(job.incremental) {
      // If it is an incremental load, fetch last run time and setup the filter
      var lastRunTime = dvDAO.formatDateFilter(this.getLastRunTime());

      if(lastRunTime) {
        console.log('incremental');
        filter = encodeURIComponent(`updateTime>="${lastRunTime}"`);
      } else {
        console.log('full reload');
      }
    } else {
      // If it is not incremental, clear the advertisers tab for a full reload
      getSheetDAO().clear(constants.ADVERTISERS_TAB, constants.ADVERTISER_RANGE);
      checkExecutionTime();
    }

    var advertiserMap = fetchAdvertisers(ids, filter);
    checkExecutionTime();

    var feedProvider = new FeedProvider(constants.ADVERTISERS_TAB).load();
    checkExecutionTime();

    while(feedItem = feedProvider.next()) {
      if(advertiserMap[feedItem[constants.ADVERTISER_ID_HEADER]]) {
        var advertiser = advertiserMap[feedItem[constants.ADVERTISER_ID_HEADER]];

        feed.push(newFeedItem(advertiser));

        delete advertiserMap[feedItem[constants.ADVERTISER_ID_HEADER]];
      } else {
        feed.push(feedItem);
      }
    }
    checkExecutionTime();

    Object.getOwnPropertyNames(advertiserMap).forEach(advertiserId => {
      feedItem = newFeedItem(advertiserMap[advertiserId]);
      feed.push(feedItem);
    });

    new FeedProvider(constants.ADVERTISERS_TAB).setFeed(feed).save();

    this.setLastRunTime(runTime);

    return job;
  }

}
