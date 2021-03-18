/*
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

/**
 * This module contains functions that are called by the sidebar to interact
 * with server side functionality
 */

/**
 * Returns the content of an html file so it can be included in the sidebar
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Identify items to load from DV360
 *
 * params:
 *  job: job passed by the sidebar
 *  job.entity: The entity type, e.g. InsertionOrder, LineItem, etc.
 *  job.itemsToLoad: is populated by this job with a list of items to load
 *
 * returns: The job object
 */
function _identifyItemsToLoad(job) {
  var loader = getLoader(job.entity);

  return loader.identifyItemsToLoad(job);
}
function identifyItemsToLoad(job) {
  return _invoke('_identifyItemsToLoad', job);
}

/**
 * Generates QA report into the feed
 *
 * params:
 *  job: job passed by the sidebar
 *  job.itemsToLoad: List of items to load
 *
 * returns: The job object
 */
function _generateQAReport(job) {
  buildHierarchy(job);

  var feed = new QA().defaultQAReport(job.hierarchy);

  new FeedProvider('QA').setFeed(feed).save();

  return job;
}
function generateQAReport(job) {
  return _invoke('_generateQAReport', job);
}

/**
 * Creates push jobs
 *
 * params:
 *  job: job passed by the sidebar
 *  job.entity: Entity to process
 *  job.jobs: Is populated with a list of jobs to run
 *
 * returns: The job object
 */
function _generatePushJobs(job) {
  var loader = getLoader(job.entity);

  loader.generatePushJobs(job);

  return job;
}
function generatePushJobs(job) {
  return _invoke('_generatePushJobs', job);
}

/**
 * Pushes to DV360
 *
 * params:
 *  job: job passed by the sidebar
 *  job.entity: Entity to process
 *  job.feedItem: Feed item to process
 *
 * returns: The job object
 */
function _pushToDV360(job) {
  var loader = getLoader(job.entity);
  loader.pushToDV360(job);
  return job;
}

function pushToDV360(job) {
  return _invoke('_pushToDV360', job);
}

/**
 * Clears a given range in the sheet
 *
 * params:
 *  job: job passed by the sidebar
 *  job.a1Notation: required parameter identifying the range to clear
 *
 * returns: The job object
 */
function _clear(job) {
  var sheetDAO = new SheetDAO();

  sheetDAO.clear(job.sheetName, job.range);

  return job;
}
function clear(job) {
  return _invoke('_clear', job);
}

/**
 * Write logs to the Log tab
 *
 * params:
 *  job.jobs: List of jobs to process
 *  job.jobs[1..N].logs: logs to output
 *  job.offset: offset to write in case existing logs already exist. If offset
 *  is 0 this also clears the log tab
 */
function _writeLogs(job) {
  var sheetDAO = new SheetDAO();
  var output = [];

  job.offset = job.offset || 0;
  var range = 'A' + (job.offset + 1) + ':B';

  for(var i = 0; i < job.jobs.length && job.jobs[i].logs; i++) {
    var logs = job.jobs[i].logs;

    for(var j = 0; j < logs.length; j++) {
      output.push(logs[j]);
    }

    job.jobs[i].logs = [];
  }

  if(output.length > 0) {
    job.offset += output.length;

    sheetDAO.setValues('Log', range + (job.offset), output);
  }

  return job;
}
function writeLogs(job) {
  return _invoke('_writeLogs', job);
}

/**
 * Function that safely tries to parse an input as a JSON object, if it fails it
 * doesn't throw an excaption, rather it just returns the input
 *
 * params:
 *  input: input value to try to parse
 *
 * result: either the json object resulting from parsing input, or input itself
 * if it is not a valid json
 */
function parse(input) {
  try {
    return JSON.parse(input);
  } catch(error) {
    return input;
  }
}

/**
 * Decorator that provides basic error handling for job invocation
 */
function _invoke(functionName, input) {
  try {
    var job = parse(input);

    return JSON.stringify(this[functionName](job));
  } catch(error) {
    console.log(error);
    job.error = error;

    throw JSON.stringify(job);
  }
}
