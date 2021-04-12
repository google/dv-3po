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

var SDFManager = function() {

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
   * Creates an SDF download task in DV360
   *
   * params:
   *  sdfFilter: Dictionary keyed by advertiser ID with lists of io ids,
   *  creates one sdf per advertiser with the IO IDs as filters. If the list of
   *  io ids is empty, returns all IOs under the advertiser.
   *
   * returns: List of SDF download tasks
   */
  this.createSDFTasks = function(sdfFilter) {
    var result = [];
    var parentEntityFilter = null;
    var idFilter = null;

    Object.getOwnPropertyNames(sdfFilter).forEach(function(advertiserId) {

      if(sdfFilter[advertiserId].length > 0) {
        parentEntityFilter = {
          'fileType': ['FILE_TYPE_INSERTION_ORDER', 'FILE_TYPE_LINE_ITEM',
            'FILE_TYPE_AD', 'FILE_TYPE_AD_GROUP'],
          'filterType': 'FILTER_TYPE_INSERTION_ORDER_ID',
          'filterIds': sdfFilter[advertiserId],
        }
      }

      var response = getDVDAO().createSDFDownloadTask(Number(advertiserId),
          idFilter, parentEntityFilter);

      result.push(response);
    });

    return result;
  }

  /**
   * Fetches the status of a SDF download task
   *
   * params: tasks list of SDF download tasks created by the API
   *
   * returns: Updated list of tasks
   */
  this.refreshSDFTasks = function(tasks) {
    var result = [];

    tasks.forEach(function(task) {
      result.push(getDVDAO().getSDFDownloadTask(task));
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
  this.downloadAndParseSDFs = function(tasks) {
    var entities = {
      'insertionOrders': [],
      'lineItems': [],
      'adGroups': [],
      'ads': []
    }

    tasks.forEach(task => {
      var sdfs = getDVDAO().downloadSDF(task);

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

}

/**
 * Singleton implementation of SDF manager
 */
var sdfManager = null;
function getSDFManager() {
  if(!sdfManager) {
    sdfManager = new SDFManager;
  }

  return sdfManager;
}
