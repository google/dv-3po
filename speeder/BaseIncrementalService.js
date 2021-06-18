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
 * Introduces basic functionality to load data from DV360 into the sheet
 * incrementally, e.g. only loads the deltas of what changed since the last run.
 */
var BaseIncrementalService = function(dvDAO) {
  var that = this;

  BaseService.call(this, dvDAO);

  /**
   * Updates the sheet to cause a full reload on the next run by removing
   * the last run dates from the config tab.
   */
  this.setupFullReload = function(job) {
    getSheetDAO().setValues(constants.CONFIG_TAB,
        this.LAST_LOAD_TIME_RANGE, [['']]);

    return job;
  }

  /**
   * Saves the last execution time to the sheet
   *
   * params: date of the last run
   */
  this.setLastRunTime = function(date) {
    getSheetDAO().setValues(constants.CONFIG_TAB,
        this.LAST_LOAD_TIME_RANGE, [[date]]);
  }

  /**
   * Fetches the last execution time of the load from the sheet
   *
   * returns: date object representing the last date the script ran
   */
  this.getLastRunTime = function() {
    return getSheetDAO().getValue(constants.CONFIG_TAB,
        this.LAST_LOAD_TIME_RANGE);
  }

}
