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
 * Underwriter validates flights and budgets to limit exposure of sequential
 * liability
 */
var UnderwriterService = function(dvDAO) {
  BaseService.call(this, dvDAO);

  /**
   * Parses underwriter segments, augment them with DV360 data and organizes
   * into objects to be used downstream in the validation process
   *
   * return: List of parsed segments
   */
  function parseUnderwriterSegments() {
    var result = [];

    var feedProvider = new FeedProvider(constants.UNDERWRITER_TAB).load();
    var totalIOs = 0;

    while(feedItem = feedProvider.next()) {
      console.log(feedItem);
      if(feedItem[constants.PARTNER_ID_HEADER] &&
          !feedItem[constants.ADVERTISER_ID_HEADER]) {
        // If partner ID is present but no advertiser id, find all advertiser ids
        // under the partner and use those to validate
        var advertisers =
            dvDAO.listAdvertisers(feedItem[constants.PARTNER_ID_HEADER]);

        //console.log(advertisers);

        advertisers.forEach(advertiser => {
          console.log(advertiser);
          console.log('Fetched IOs:');
          console.log(dvDAO.listInsertionOrders(advertiser.advertiserId).length);
          totalIOs += dvDAO.listInsertionOrders(advertiser.advertiserId).length;
        });
      }

      // If partner ID is present, and advertiser ID as well, add non covered
      // advertiser IDs to coverage error list

      // If only advertiser IDs are present, use those as source for validation
    }

    console.log('total IOs');
    console.log(totalIOs);
    return result;
  }

  /**
   * Performs the underwriter validation and loads data into the Validation tab
   *
   * params: the job object
   *  job.entity: Underwriter
   */
  this.load = function(job) {
    console.log('Underwritting!');

    var underwriterSegments = parseUnderwriterSegments();

    return job;
  }

}

