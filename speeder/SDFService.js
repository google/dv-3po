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
 * Loads data into the feed using Structured Data Files
 */
var SDFService = function(dvDAO) {
  var that = this;

  BaseService.call(this, dvDAO);

  /**
   * Creates an SDF download task in DV360 based on parameters defined in the
   * job object.
   *
   * params: job empty object
   *
   * returns: tasks are added to a job.tasks array
   *
   */
  this.createSDFTasks = function(job) {
    var feedProvider = new FeedProvider(this.tabName, this.keys).load();
    var sdfFilter = this.getSDFFilter(job);

    job.tasks = getSDFManager().createSDFTasks(sdfFilter);

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
    job.tasks = getSDFManager().refreshSDFTasks(job.tasks);

    return job;
  }

}

