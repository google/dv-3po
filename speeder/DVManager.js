/***************************************************************************
*
*  Copyright 2020 Google Inc.
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

var DVManager = function() {
  var dao = new DVDAO();

  var fetchers = [
      new IdFetcher(dao)
  ];

  var fieldHandlers = [
      new ActiveFieldHandler(),
      new FixedBidFieldHandler()
  ];

  var sheetDAO = getSheetDAO();

  function getFeed() {
    return sheetDAO.sheetToDict('Rules');
  }

  function uniquefy(list, uniqueField) {
    var map = {};
    var result = [];

    for(var i = 0; i < list.length; i++) {
      var item = list[i];
      var key = item[uniqueField];

      map[key] = item;
    }

    var keys = Object.getOwnPropertyNames(map);

    for(var i = 0; i < keys.length; i++) {
      var key = keys[i];

      result.push(map[key]);
    }

    return result;
  }

  function fetch(feed) {
    var result = [];

    for(var i = 0; i < fetchers.length; i++) {
      var fetcher = fetchers[i];

      result = result.concat(fetcher.fetch(feed));
    }

    return uniquefy(result, 'lineItemId');
  }

  this.update = function() {
    var feed = getFeed();
    var updates = fetch(feed);
    var activity = [];

    each(updates, function(update) {
      var updateMask = [];

      each(fieldHandlers, function(fieldHandler) {
        fieldHandler.handle(update.feedItem, update.lineItem, updateMask);
      });

      if (updateMask.length) {
        dao.patchLineItem(update.lineItem, updateMask.join(','));
        activity.push([
          new Date(),
          'Updating LI ' + update.lineItem.displayName + ' (' + update.lineItem.lineItemId + ')'
        ]);
      }
    });

    return activity;
  }

  /**
   * Returns all IOs under an advertiser or campaign
   *
   * params:
   *  advertiserId: Integer, the advertiser ID
   *  campaignId: Optional, the campaign ID, if not provided all IOs under the
   *  advertiser are returned
   *
   * returns: List of IOs that matched the criteria
   */
  this.getIOs = function(advertiserId, campaignId) {
    var filter = null;
    var ios = [];

    if(campaignId) {
      filter = `${constants.CAMPAIGN_ID_API}=${campaignId}`;
    }

    var page = dao.listInsertionOrders(advertiserId, filter);

    while(page && page.insertionOrders.length > 0) {
      ios = ios.concat(page.insertionOrders);

      if(page.nextPageToken) {
        page = dao.listInsertionOrders(advertiserId, filter,
            page.nextPageToken);
      } else {
        page = null;
      }
    }

    return ios;
  }


}
