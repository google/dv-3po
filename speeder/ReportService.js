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
 * Function set up as trigger for pulling reports from DV360 on a schedule
 */
function pullReportTrigger(event) {
  if(event && event.triggerUid) {
    var feedItem = PropertiesService.getDocumentProperties().getProperty(
        event.triggerUid);

    if(feedItem) {
      feedItem = JSON.parse(feedItem);

      var job = {
        'reportId': feedItem[constants.REPORT_ID_HEADER],
        'tab': feedItem[constants.TARGET_TAB_HEADER],
        'entity': constants.REPORT_ENTITY
      }

      getLoader(constants.REPORT_ENTITY).load(job);
    }

  }
}

/**
 * Loads reports from DV360
 */
var ReportsService = function(dvDAO) {
  BaseService.call(this, dvDAO);

  /**
   * Reads the feed and identify items to be loaded and creates jobs to be
   * executed by the load function
   *
   *  params: job.entity Name of the entity to identify
   *
   *  returns: updates job.jobs directly to add resulting jobs
   */
  this.identifyItemsToLoad = function(job) {
    var feed = new FeedProvider(this.tabName, this.keys).load();

    job.jobs = [];

    while(feedItem = feed.next()) {
      job.jobs.push({
        'reportId': feedItem[constants.REPORT_ID_HEADER],
        'tab': feedItem[constants.TARGET_TAB_HEADER],
        'entity': job.entity
      });
    }

    return job;
  }

  /**
   * Loads the latest file of a report from DV360 into a sheet tab
   *
   * params:
   *   job.reportId: The ID of the report
   *   job.tab: In which tab to load the report
   */
  this.load = function(job) {
    var sheetDAO = getSheetDAO();
    var report = dvDAO.getReport(job.reportId);

    var fullReport = Utilities.parseCsv(dvDAO.getLatestReportFile(report));

    if(fullReport.length > 0 && fullReport[0].length > 0) {
      var reportData = [];

      for(var i = 0; i < fullReport.length && fullReport[i].join(''); i++) {
        reportData.push(fullReport[i]);
      }

      var range =
          `A1:${sheetDAO.columns[reportData[0].length - 1]}${reportData.length}`;

      sheetDAO.clear(job.tab, constants.REPORT_CLEAR_RANGE);
      sheetDAO.setValues(job.tab, range, reportData);
    }

    return job;
  }

  /**
   * Clear all existing triggers and sets up new report triggers to pull reports
   * on a schedule
   *
   *  params: job.tab the tab where reports are defined
   *
   *  returns: unchanged job object, trigger definitions are written directly to
   *  the report tab
   */
  this.scheduleReportTriggers = function(job) {

    deleteTriggers(constants.PULL_REPORT_TRIGGER_FUNCTION);

    var feed = new FeedProvider(this.tabName, this.keys).load();

    while(feedItem = feed.next()) {
      try {
        var hour = Utilities.formatDate(feedItem[constants.RUN_AT_HEADER],
              SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'H');

        var trigger = ScriptApp.newTrigger(constants.PULL_REPORT_TRIGGER_FUNCTION)
            .timeBased()
            .atHour(hour)
            .everyDays(1)
            .create();

        PropertiesService.getDocumentProperties().setProperty(
            trigger.getUniqueId(), JSON.stringify(feedItem));

        feedItem[constants.TRIGGER_ID_HEADER] = trigger.getUniqueId();

        // This prevents the full date to be set back to the spreadsheet column
        // as we just need the time
        feedItem[constants.RUN_AT_HEADER] =
            Utilities.formatDate(feedItem[constants.RUN_AT_HEADER],
                SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'HH:mma');
      } catch(error) {
        console.log(error);
        feedItem[constants.TRIGGER_ID_HEADER] = error;
      }
    }

    feed.save();

    return job;
  }

}
