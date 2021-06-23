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

/*
  Declare context object so we can call functions by name, this enables
  configuration based functionality, so the tool behaves according to settings
  defined in the sheet.
*/
var context = this;

/**
 * onOpen handler to display menu
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createMenu('DV-3PO Speeder')
      .addItem('Open', 'speeder')
      .addToUi();
}

/**
 * Display sidebar
 */
function speeder() {
  var html = null;

  var sidebarTemplate = getSheetDAO().getValue('Config', 'B1');

  var html = HtmlService.createTemplateFromFile(sidebarTemplate)
      .evaluate()
      .setTitle('DV-3PO Speeder');

  SpreadsheetApp.getUi().showSidebar(html);
}

function authenticate() {
  new DVDAO();
}

/**
 * For each implementation, invokes func(index, item) for each item in the list
 * list: Array of items to iterate
 * func: function that takes integer index and item as parameters
 */
function forEach(items, func) {
  if(Array.isArray(items)) {
    for(var i = 0; i < items.length; i++) {
      if(func) {
        func(i, items[i]);
      }
    }
  }
}

/**
* Given an error raised by an API call, determines if the error has a chance
* of succeeding if it is retried. A good example of a "retriable" error is
* rate limit, in which case waiting for a few seconds and trying again might
* refresh the quota and allow the transaction to go through. This method is
* desidned to be used by the _retry function.
*
* params:
* error: error to verify
*
* returns: true if the error is "retriable", false otherwise
*/
function isRetriableError(error) {
  var retriableErroMessages = constants.RETRIABLE_ERROR_MESSAGES;

  if(error && error.message) {
    var message = error.message.toLowerCase();

    retriableErroMessages.forEach(function(retriableMessage) {
      if(message.indexOf(retriableMessage) != -1) {
        return true;
      }
    });
  }

  return false;
}

/**
 * Wrapper to add retries and exponential backoff on API calls
 *
 * params:
 *  fn: function to be invoked, the return of this funcntion is returned
 *  retries: Number of ties to retry
 *  sleep: How many milliseconds to sleep, it will be doubled at each retry.
 *
 * returns: The return of fn
 */
function _retry(fn, retries, sleep) {
  try {
    var result = fn();
    return result;
  } catch(error) {
    if(isRetriableError(error) && retries > 0) {
      Utilities.sleep(sleep);
      return _retry(fn, retries - 1, sleep * 2);
    } else {
      throw error;
    }
  }
}

/**
 * Deletes all triggers with a given handler function name
 *
 * params: handlerFunctionName: String with the name of the handler function
 */
function deleteTriggers(handlerFunctionName) {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if(!handlerFunctionName || trigger.getHandlerFunction() === handlerFunctionName) {
      PropertiesService.getDocumentProperties()
          .deleteProperty(trigger.getUniqueId());

      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * Invokes a function and handles errors by sending out email notifications to
 * Underwriter admin if exceptions are raised.
 *
 * params: func the function to invoke, must take no parameters
 */
function errorHandlerInvoke(func, _finally) {
  try {
    func();
  } catch(error) {
    var adminEmail = getSheetDAO().getValue(constants.CONFIG_TAB,
        constants.ADMIN_EMAIL_RANGE);

    if(adminEmail) {
      new EmailService().sendEmail('Underwriter', null, {
        'underwriter': [error]
      }, adminEmail);
    }
  } finally {
    if(_finally) {
      _finally();
    }
  }
}

// Holds start time for execution to be used to check if the execution time is
// in danger of being exceeded
var executionStart = null;

/**
 * Check if the execution time is in danger of being exceeded. The first time
 * this function is called it will record the time as the start of the
 * execution. In subsequent calls if the current time - start time >
 * constants.MAX_EXECUTION_TIME, it will throw an exception.
 */
function checkExecutionTime() {
  if(!executionStart) {
    executionStart = new Date();
  } else {
    if((new Date() - executionStart) / 1000 > constants.MAX_EXECUTION_TIME) {
      throw 'Maximun execution time exceeded';
    }
  }
}
