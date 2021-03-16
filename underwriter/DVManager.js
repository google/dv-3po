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
  var dao = new getDVDAO();
  var sheetDAO = getSheetDAO();

  var timezones = {};

  /**
   * Parses the budget segments into a more useful format including budget,
   * startDate and endDate
   *
   * param: segments - list of budget segments in SDF format
   *
   * returns: dictionary with parsed budget segments
   */
  function parseBudgetSegments(segments, io) {
    var data = segments.replace(new RegExp('\\(', 'g'), '').replace(new RegExp(';\\)', 'g'), '').replace(new RegExp(' ', 'g'), '').split(';');
    var result = [];

    for(var i = 0; i < (data.length - 2); i += 3) {
      result.push({
        'budget': Number(data[i]),
        'startDate': new Date(data[i + 1]),
        'endDate': new Date(data[i + 2]),
        'ioId': io['Io Id']
      });
    }

    return result;
  }

  /**
   * Augment SDF ios by parsing certain fields and adding data such as
   * advertiser ID to make ios more useful.
   *
   * params:
   *  ios - list of sdf ios, they are updated directly and fields called
   *  Parsed Segments, and Advertiser ID are injected.
   *  ioAdvMap - dictionary keyed by IO ID with Advertiser ID
   *
   * returns: ios
   */
  function augmentIOs(ios, ioAdvMap) {
    each(ios, function(io, index) {
      io['Parsed Segments'] = parseBudgetSegments(io['Budget Segments'], io);
      io['Advertiser ID'] = ioAdvMap[io['Io Id']];
    });

    return ios;
  }

  function getIOs(advertiserId, campaignId) {
    var filter = null;
    var ios = [];

    if(campaignId) {
      filter = 'campaignId=' + campaignId;
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

  function createSDFDownloadTask(advertiserId, ios) {
    var idFilter = {
      "insertionOrderIds": []
    }

    each(ios, function(io, index) {
      idFilter["insertionOrderIds"].push(io.insertionOrderId);
    });

    return dao.createSDFDownloadTask(advertiserId, idFilter);
  }

  function ioSDFToDict(data) {
    var csv = Utilities.parseCsv(data);

    var result = [];

    if(csv.length > 1) {
      var header;

      each(csv, function(row, index) {
        if(index == 0) {
          header = row;
        } else {
          var io = {};

          each(header, function(field, index) {
            io[field] = row[index];
          });

          result.push(io);
        }
      });
    }

    return result;
  }

  function downloadSDFs(tasks) {
    var result = [];

    while(tasks.length > 0) {
      var pendingSDFDownloadTasks = [];

      each(tasks, function(task, index) {
        var updatedTask = dao.getSDFDownloadTask(task);

        if(updatedTask.done) {
          var sdf = dao.downloadSDF(updatedTask);
          if(sdf.length > 0) {
            result = result.concat(ioSDFToDict(sdf[0].getDataAsString()));
          }
        } else {
          pendingSDFDownloadTasks.push(updatedTask);
        }

        Utilities.sleep(5000);
      });

      tasks = pendingSDFDownloadTasks;
    }


    return result;
  }

  // Filters is array of objects with fields: advertiserId and campaignId
  this.sdfGetIOs = function(filters) {
    var sdfDownloadTasks = [];
    var result = [];
    var ioAdvMap = {};

    each(filters, function(filter, index) {
      var ios = getIOs(filter.advertiserId, filter.campaignId);

      each(ios, function(io, index) {
        ioAdvMap[io.insertionOrderId] = io.advertiserId;
      });

      sdfDownloadTasks.push(createSDFDownloadTask(filter.advertiserId, ios));
    });

    return augmentIOs(downloadSDFs(sdfDownloadTasks), ioAdvMap);
  }

  this.getMockSDF = function() {
    var testTasks = [{ name: 'sdfdownloadtasks/operations/6371986',
    metadata:
     { '@type': 'type.googleapis.com/google.ads.displayvideo.v1.SdfDownloadTaskMetadata',
       createTime: '2020-10-19T16:49:02.126Z',
       endTime: '2020-10-19T16:49:41.036Z',
       version: 'SDF_VERSION_5_2' },
    done: true,
    response:
     { '@type': 'type.googleapis.com/google.ads.displayvideo.v1.SdfDownloadTask',
       resourceName: 'sdfdownloadtasks/media/6371986' } }]

    return downloadSDFs(testTasks);
  }

  this.getAdvertiserTimezone = function(advertiserId) {
    if(!timezones[advertiserId]) {
      var advertiser = dao.getAdvertiser(advertiserId);

      timezones[advertiserId] = advertiser.generalConfig.timeZone;
    }

    return timezones[advertiserId];
  }

}

var dvManager = null;
function getDVManager() {
  if(!dvManager) {
    dvManager = new DVManager();
  }

  return dvManager;
}
