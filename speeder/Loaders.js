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
 * Insertion order loader
 */
var InsertionOrderLoader = function(dvDAO) {
  this.tabName = 'QA';
  this.keys = ['Advertiser ID', 'Insertion Order ID'];

  BaseLoader.call(this, dvDAO);

  /**
   * Identify items to be loaded based on values in defined by the user in the
   * entity's respective tab.
   *
   * params:
   *   job: The job passed by the sidebar
   *   job.itemsToLoad: Is populated with the items from DV that need to be
   *   loaded
   */
  this.identifyItemsToLoad = function(job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    job.itemsToLoad = [];
    job.idField = 'insertionOrderId';

    var feedItem = null;
    while(feedItem = feedProvider.next()) {
      var io = dvDAO.getInsertionOrder(feedItem['Advertiser ID'], feedItem['Insertion Order ID']);

      if(io) {
        job.itemsToLoad.push(io)
      }
    }

    return job;
  }

  /**
   * Generates the QA report and writes to the sheet.
   *
   * params:
   *  job: The job passed by the UI
   *  job.itemsToLoad: list of DV360 IOs to load
   */
  this.generateQAReport = function(job) {
    var feed = [];

    forEach(job.itemsToLoad, function(index, insertionOrder) {
      var feedItem = {};

      feedItem['Advertiser ID'] = insertionOrder.advertiserId;
      feedItem['Insertion Order ID'] = insertionOrder.insertionOrderId;
      feedItem['Insertion Order Name'] = insertionOrder.displayName;

      feed.push(feedItem);
    });

    new FeedProvider(this.tabName, this.keys).setFeed(feed).save();

    return job;
  }

}
InsertionOrderLoader.prototype = Object.create(BaseLoader.prototype);

/**
 * Line item loader
 */
var LineItemLoader = function(dvDAO) {
  var that = this;
  this.tabName = 'QA';
  this.keys = ['Advertiser ID', 'Line Item ID'];

  BaseLoader.call(this, dvDAO);

  /**
   * Identify items to be loaded based on values in defined by the user in the
   * entity's respective tab.
   *
   * params:
   *   job: The job passed by the sidebar
   *   job.itemsToLoad: Is populated with the items from DV that need to be
   *   loaded
   */
  this.identifyItemsToLoad = function(job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    job.itemsToLoad = [];
    job.idField = 'lineItemId';

    var feedItem = null;
    while(feedItem = feedProvider.next()) {
      var lineItems = dvDAO.listLineItems(feedItem['Advertiser ID'], feedItem['Insertion Order ID']);

      forEach(lineItems, function(index, lineItem) {
        var targetingOptions = dvDAO.listTargetingOptions(
            feedItem['Advertiser ID'], lineItem.lineItemId,
            'TARGETING_TYPE_KEYWORD');

        lineItem.keywordTargeting = targetingOptions.assignedTargetingOptions;
      });

      job.itemsToLoad = job.itemsToLoad.concat(lineItems);
    }

    return job;
  }

  /**
   * Generates the QA report and writes to the sheet.
   *
   * params:
   *  job: The job passed by the UI
   *  job.itemsToLoad: list of DV360 IOs to load
   */
  this.generateQAReport = function(job) {
    var feed = [];

    forEach(job.itemsToLoad, function(index, insertionOrder) {
      var feedItem = {};

      feedItem['Advertiser ID'] = insertionOrder.advertiserId;
      feedItem['Insertion Order ID'] = insertionOrder.insertionOrderId;
      feedItem['Insertion Order Name'] = insertionOrder.displayName;

      feed.push(feedItem);
    });

    new FeedProvider(this.tabName, this.keys).setFeed(feed).save();

    return job;
  }

  /**
   * Returns a list of items of list 2 that are not included in list 1
   *
   * params:
   *  list1: array of strings
   *  list2: array of strings
   *
   * returns: array of strings of items in list 2 that are not included in list 1
   */
  function missingItems(list1, list2) {
    var result = [];

    forEach(list2, function(index, item) {
      if(list1.indexOf(item) == -1) {
        result.push(item);
      }
    });

    return result;
  }

  /**
   * Performs a DV360 push.
   *
   * params:
   *  job.feedItem: The feed item to process
   *
   * returns:
   *  the job
   */
  this.push = function(job) {
    // Fetch the line item
    var feedItem = job.feedItem;

    var keywordsTargeting = this.dvdao.listTargetingOptions(
        feedItem['Advertiser ID'], feedItem['Line Item ID'],
        'TARGETING_TYPE_KEYWORD');
    var keywordInclusions = [];
    var keywordExclusions = [];

    forEach(keywordsTargeting.assignedTargetingOptions, function(index, targetingOptions) {
      var keywordTarget = targetingOptions.keywordDetails;

      if(keywordTarget.negative) {
        keywordExclusions.push(keywordTarget.keyword);
      } else {
        keywordInclusions.push(keywordTarget.keyword);
      }
    });

    var newKeywordInclusions = missingItems(keywordInclusions, feedItem['Keyword Inclusions'].split(','));
    var newKeywordExclusions = missingItems(keywordExclusions, feedItem['Keyword Exclusions'].split(','));

    forEach(newKeywordInclusions, function(index, keyword) {
      if(keyword) {
        var payload = {
          'keywordDetails': {
            'keyword': keyword,
            'negative': false
          }
        }

        that.dvdao.addTargetingOption(feedItem['Advertiser ID'],
            feedItem['Line Item ID'], 'TARGETING_TYPE_KEYWORD', payload);
      }
    });

    forEach(newKeywordExclusions, function(index, keyword) {
      if(keyword) {
        var payload = {
          'keywordDetails': {
          'keyword': keyword,
          'negative': true
          }
        }

        that.dvdao.addTargetingOption(feedItem['Advertiser ID'],
            feedItem['Line Item ID'], 'TARGETING_TYPE_KEYWORD', payload);
      }
    });
  }

}
LineItemLoader.prototype = Object.create(BaseLoader.prototype);

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

var loaders = null;
/**
 * Returns a loader for a specific entity
 *
 * params:
 *  entity: Name of the entity for which to return the loader, it can be
 *  InsertionOrder.
 *
 * returns:
 *  Loder object for the respective entity.
 */
function getLoader(entity) {
  var dvDAO = new DVDAO();

  if(!loaders) {
    loaders = {
      'InsertionOrder': new InsertionOrderLoader(dvDAO),
      'LineItem': new LineItemLoader(dvDAO)
    }
  }

  return loaders[entity];
}
