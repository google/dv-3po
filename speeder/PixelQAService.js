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
 * Loads data from DV360 and CM to generate pixel QA report
 */
var PixelQAService = function(dvDAO) {

  SDFService.call(this, dvDAO);

  /**
   * Turns lists of DV360 entities in a hierarchy tree
   *
   * params: entities, dictionary with fields: insertionOrders, lineItems,
   * adGroups, and ads, with arrays of the respective items. The items must be
   * in the dictionary form returned by the function sdfToDict
   *
   * returns: A list of IOs, with their associated line items under a lineItems
   * fields, those in turn have their associated ad groups in a adGroups field,
   * and finally those have their associated ads in the ads field.
   */
  function sdfBuildHierarchy(entities) {
    var result = [];

    var ioMap = {};
    var liMap = {};
    var agMap = {};


    entities.insertionOrders.forEach(insertionOrder => {
      result.push(insertionOrder);

      ioMap[insertionOrder['Io Id']] = insertionOrder;

      insertionOrder.lineItems = [];
    });

    entities.lineItems.forEach(lineItem => {
      ioMap[lineItem['Io Id']].lineItems.push(lineItem);

      liMap[lineItem['Line Item Id']] = lineItem;

      lineItem.adGroups = [];
    });

    entities.adGroups.forEach(adGroup => {
      liMap[adGroup['Line Item Id']].adGroups.push(adGroup);

      agMap[adGroup['Ad Group Id']] = adGroup;

      adGroup.ads = [];
    });

    entities.ads.forEach(ad => {
      agMap[ad['Ad Group Id']].ads.push(ad);
    });

    return result;
  }

  /**
   * Runs a function for each ad group in the hierarchy passing the io, line
   * item, ad group, and ad as parameters
   *
   * params:
   *   hierarchy: hierarchy built by the sdfBuildHierarchy function
   *   func: function with the following parameters: io, li, adGroup, ad
   */
  function forEachAdGroup(hierarchy, func) {
    hierarchy.forEach(io => {
      io.lineItems.forEach(li => {
        li.adGroups.forEach(adGroup => {
          adGroup.ads.forEach(ad => {
            func(io, li, adGroup, ad);
          });
        });
      });
    });
  }

  /**
   * Returns the SDF filter to be used to generate the files, this is invoked by
   * the super class createSDFTasks function
   */
  this.getSDFFilter = function(job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    var result = {};

    // This is necessary because the InsertionOrder SDF file doesn't contain an
    // advertiser ID field, the alternative would be to pull the SDFs from the
    // campaign level and filter, which would require additional input from the
    // user and heavier processing.
    job.ioAdvMap = {};

    // Build map of advertiser ids and insertion order ids because SDFs are
    // advertiser level so one SDF needs to be generated per advertiser
    while(feedItem = feedProvider.next()) {
      var advertiserId = feedItem[constants.ADVERTISER_ID_HEADER];

      if(!result[advertiserId]) {
        result[advertiserId] = [];
      }

      var ioId = feedItem[constants.INSERTION_ORDER_ID_HEADER];

      job.ioAdvMap[ioId] = advertiserId;
      result[advertiserId].push(ioId);
    }

    return result;
  }

  /**
   * Performs the load from DV by parsing the SDF files and mapping to the feed
   * and writing to the sheet
   *
   * params: job.tasks completed SDF Download tasks
   *
   * returns: job
   */
  this.load = function(job) {
    var hierarchy = sdfBuildHierarchy(getSDFManager().downloadAndParseSDFs(job.tasks));
    var feed = [];

    var profileId = getSheetDAO().getValue('Config', 'B2');
    var cmDAO = new CampaignManagerDAO(profileId);

    forEachAdGroup(hierarchy, (io, li, adGroup, ad) => {
      feedItem = {};

      feedItem[constants.ADVERTISER_ID_HEADER] = job.ioAdvMap[io['Io Id']];
      feedItem[constants.INSERTION_ORDER_ID_HEADER] = io['Io Id'];
      feedItem[constants.INSERTION_ORDER_NAME_HEADER] = io['Name'];

      feedItem[constants.LINE_ITEM_ID_HEADER] = li['Line Item Id'];
      feedItem[constants.LINE_ITEM_NAME_HEADER] = li['Name'];

      feedItem[constants.AD_GROUP_ID_HEADER] = adGroup['Ad Group Id'];
      feedItem[constants.AD_GROUP_NAME_HEADER] = adGroup['Name'];

      feedItem[constants.AD_ID_HEADER] = ad['Ad Id'];
      feedItem[constants.AD_NAME_HEADER] = ad['Name'];

      var placementId = ad['DCM Tracking - Placement Id'];
      var adId = ad['DCM Tracking - Ad Id'];
      var creativeId = ad['DCM Tracking - Creative Id'];
      feedItem[constants.TRACKING_PLACEMENT_ID_HEADER] = placementId;
      feedItem[constants.TRACKING_AD_ID_HEADER] = adId;
      feedItem[constants.TRACKING_CREATIVE_ID_HEADER] = creativeId;

      if(placementId) {
        try {
          var placement = cmDAO.get('Placements', placementId);
          feedItem[constants.PLACEMENT_NAME_HEADER] = placement.name;
        } catch(error) {
          console.log('User profile ${profileId} does not have access to see placement ${placementId}');
        }
      }

      if(adId) {
        try {
          var ad = cmDAO.get('Ads', adId);
          feedItem[constants.TRACKING_AD_NAME_HEADER] = ad.name;
        } catch(error) {
          console.log('User profile ${profileId} does not have access to see ad ${adId}');
        }
      }

      if(creativeId) {
        try {
          var creative = cmDAO.get('Creatives', creativeId);
          feedItem[constants.CREATIVE_NAME_HEADER] = creative.name;
        } catch(error) {
          console.log('User profile ${profileId} does not have access to see creative ${creativeId}');
        }
      }

      feed.push(feedItem);
    });

    new FeedProvider('QA').setFeed(feed).save();

    return job;
  }

}
