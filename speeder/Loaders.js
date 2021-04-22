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
 * Base class for all loaders, provides common functionality and top level
 * orchestration of common flows
 */
var BaseLoader = function(dvDAO) {
  var sheetDAO = getSheetDAO();

  this.dvdao = getDVDAO();

  /**
   * Creates push jobs based on data in the tab of the respective entity
   *
   * params:
   *  job: The job object, job.jobs is populated with the list of items that
   *  need to be processed
   */
  this.generatePushJobs = function(job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    job.jobs = [];

    while(feedItem = feedProvider.next()) {
      job.jobs.push({'entity': job.entity, 'feedItem': feedItem});
    }

    return job;
  }
}

/**
 * Template Loader
 */
var TemplateLoader = function(dvDAO) {
  BaseLoader.call(this, dvDAO);
}
TemplateLoader.prototype = Object.create(BaseLoader.prototype);

/**
 * Loads data into the feed using Structured Data Files
 */
var SDFLoader = function(dvDAO) {
  var that = this;

  BaseLoader.call(this, dvDAO);

  /**
   * Parses an SDF file and returns a list of dictionaries representing the rows
   * keyed by the field name
   *
   * params: data csv string representing the SDF file
   *
   * returns: list of dictionaries
   */
  function sdfToDict(data) {
    var csv = Utilities.parseCsv(data);

    var result = [];

    var header;

    csv.forEach(function(row, index) {
      if(index == 0) {
        header = row;
      } else {
        var item = {};

        header.forEach(function(field, index) {
          item[field] = row[index];
        });

        result.push(item);
      }
    });

    return result;
  }

  /**
   * Creates an SDF download task in DV360 based on parameters defined in the
   * job object.
   */
  this.createSDFTasks = function(job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    var advertiserMap = {};

    // This is necessary because the InsertionOrder SDF file doesn't contain an
    // advertiser ID field, the alternative would be to pull the SDFs from the
    // campaign level and filter, which would require additional input from the
    // user and heavier processing.
    job.ioAdvMap = {};

    // Build map of advertiser ids and insertion order ids because SDFs are
    // advertiser level so one SDF needs to be generated per advertiser
    while(feedItem = feedProvider.next()) {
      var advertiserId = feedItem[constants.ADVERTISER_ID_HEADER];

      if(!advertiserMap[advertiserId]) {
        advertiserMap[advertiserId] = [];
      }

      var ioId = feedItem[constants.INSERTION_ORDER_ID_HEADER];

      job.ioAdvMap[ioId] = advertiserId;
      advertiserMap[advertiserId].push(ioId);
    }

    job.tasks = [];

    Object.getOwnPropertyNames(advertiserMap).forEach(function(advertiserId) {
      var parentEntityFilter = {
        'fileType': ['FILE_TYPE_INSERTION_ORDER', 'FILE_TYPE_LINE_ITEM',
          'FILE_TYPE_AD', 'FILE_TYPE_AD_GROUP'],
        'filterType': 'FILTER_TYPE_INSERTION_ORDER_ID',
        'filterIds': advertiserMap[advertiserId],
      }

      var response = dvDAO.createSDFDownloadTask(Number(advertiserId), null,
          parentEntityFilter);

      job.tasks.push(response);
    });

    return job;
  }

  /**
   * Fetches the status of a SDF download task
   *
   * params: job.tasks list of SDF download tasks created by the API
   *
   * returns: updates tasks directly in job.tasks with the latest status
   */
  this.refreshSDFTasks = function(job) {
    var tasks = [];

    job.tasks.forEach(function(task) {
      tasks.push(dvDAO.getSDFDownloadTask(task));
    });

    job.tasks = tasks;

    return job;
  }

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
   * Downloads, parses and organizes SDF data from DV360.
   *
   * params: tasks. List of completed SDF download tasks (i.e. done == true)
   *
   * returns: Dictionary with fields insertionOrders, lineItems, adGroups, and
   * ads. Each containing a list of dictionaries of the parsed SDF files.
   */
  function downloadAndParseSDFs(tasks) {
    var entities = {
      'insertionOrders': [],
      'lineItems': [],
      'adGroups': [],
      'ads': []
    }

    tasks.forEach(task => {
      var sdfs = dvDAO.downloadSDF(task);

      sdfs.forEach(sdf => {
        if(sdf.getName().indexOf('InsertionOrders') != -1) {
          entities.insertionOrders = entities.insertionOrders.concat(sdfToDict(sdf.getDataAsString()));
        } else if(sdf.getName().indexOf('LineItems') != -1) {
          entities.lineItems = entities.lineItems.concat(sdfToDict(sdf.getDataAsString()));
        } else if(sdf.getName().indexOf('AdGroups') != -1) {
          entities.adGroups = entities.adGroups.concat(sdfToDict(sdf.getDataAsString()));
        } else if(sdf.getName().indexOf('AdGroupAds') != -1) {
          entities.ads = entities.ads.concat(sdfToDict(sdf.getDataAsString()));
        }
      });
    });

    return entities;
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
   * Performs the load from DV by parsing the SDF files and mapping to the feed
   * and writing to the sheet
   *
   * params: job.tasks completed SDF Download tasks
   *
   * returns: job
   */
  this.load = function(job) {
    var hierarchy = sdfBuildHierarchy(downloadAndParseSDFs(job.tasks));
    var feed = [];

    var profileId = getSheetDAO().getValue('Config', 'B2');
    var cmDAO = new CampaignManagerDAO(profileId);

    forEachAdGroup(hierarchy, (io, li, adGroup, ad) => {
      feedItem = {};

      feedItem[constants.ADVERTISER_ID_HEADER] = job.ioAdvMap[io['Io Id']];
      feedItem[constants.INSERTION_ORDER_ID_HEADER] = io['Io Id'];
      feedItem[constants.INSERTION_ORDER_NAME] = io['Name'];

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
SDFLoader.prototype = Object.create(BaseLoader.prototype);

/**
 * Builds a hierarchy of DV360 entities based on their relationship to simplify
 * the process of creating the QA report later
 *
 * params:
 *  job: The list of jobs containing the items to load
 *  job.jobs: List of jobs returned by IdentifyItemsToLoad
 *
 * returns:
 *   Injects the hierarchy in the jobs.hierarchy field
 */
function buildHierarchy(job) {
  var itemsMap = {};
  job.hierarchy = [];

  forEach(job.jobs, function(index, job) {
    if(!itemsMap[job.entity]) {
      itemsMap[job.entity] = {};
    }

    forEach(job.itemsToLoad, function(index, itemToLoad) {
      itemsMap[job.entity][itemToLoad[job.idField]] = itemToLoad;
    });
  });

  forEach(Object.getOwnPropertyNames(itemsMap['InsertionOrder']), function(index, insertionOrderId) {
    var insertionOrder = itemsMap['InsertionOrder'][insertionOrderId];
    job.hierarchy.push(insertionOrder);

    forEach(Object.getOwnPropertyNames(itemsMap['LineItem']), function(index, lineItemId) {
      var lineItem = itemsMap['LineItem'][lineItemId];

      if(lineItem.insertionOrderId == insertionOrder.insertionOrderId) {
        if(!insertionOrder.lineItems) {
          insertionOrder.lineItems = [];
        }

        insertionOrder.lineItems.push(lineItem);
      }
    });
  });
}

// Map of loaders used by getLoaders
var loaders = null;

/**
 * Returns a map of loaders, uses the Entity configs tab to determine which
 * loader should be used for each entity.
 */
function getLoaders() {
  if(!loaders) {
    loaders = {};
    var dvDAO = new DVDAO();
    var entityConfigs = getSheetDAO().sheetToDict('Entity Configs');

    entityConfigs.forEach(function(entityConfig) {
      var loader = new context[entityConfig['Loader']](dvDAO);
      context[entityConfig['Loader']].prototype = Object.create(BaseLoader.prototype);
      loader.keys = entityConfig['Keys'].split(',');
      loader.tabName = entityConfig['Tab'];
      loaders[entityConfig['Entity']] = loader;
    });
  }

  return loaders;
}

/**
 * Gets the loader that should be used for a specific entity.
 *
 * params:
 *  entity: string representing the entity name as in the Entity Configs tab
 *
 * returns: Loader object
 */
function getLoader(entity) {
  return getLoaders()[entity];
}
