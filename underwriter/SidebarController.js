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
 * Executes underwriter
 *
 * params: Empty job object
 *
 * returns: The job object
 */
function _underwriter(job) {
  new Underwriter().validate();

  return job;
}
function underwriter(job) {
  return _invoke('_underwriter', job);
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

  job.offset = job.offset || 1;
  var range = 'A' + (job.offset + 1) + ':C';

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
