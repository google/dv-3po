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
var BaseService = function(dvDAO) {
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

      context[entityConfig['Loader']].prototype = Object.create(BaseService.prototype);

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
