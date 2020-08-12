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

var ui = null;

function getUi() {
  if(!ui) {
    ui = SpreadsheetApp.getUi();
  }

  return ui;
}

function onOpen(e) {
  getUi().createMenu('DV-3PO Custom Signals')
      .addItem('Run', 'run')
      .addItem('Setup Triggers', 'triggers')
      .addToUi();
}

function run() {
  var sheetDAO = new SheetDAO();
  var activity = sheetDAO.getValues('Status', 'A4:B');

  new WeatherGov('Weather').refresh();
  new OpenWeather('OpenWeather').refresh();

  activity = activity.concat(new DVManager().update());

  sheetDAO.setValues('Status', 'B1:B2', [[new Date()], ['Success']]);
  sheetDAO.setValues('Status', 'A4:B' + (3 + activity.length), activity);
}

function triggers() {
  var response = getUi().alert(
      'DV-3PO',
      'Remove all project triggers and create new one based on specification in the Config tab?',
      getUi().ButtonSet.YES_NO);
  var scheduleMessage = 'Every ';

  if (response == getUi().Button.YES) {
    try {
      var triggers = ScriptApp.getProjectTriggers();
      var sheetDAO = getSheetDAO();

      sheetDAO.setValues('Config', 'D3', [
        [
          "Updating schedule ..."
        ]
      ]);

      for (var i = 0; i < triggers.length; i++) {
        var trigger = triggers[i];

        ScriptApp.deleteTrigger(trigger);
      }

      var configs = new Configs();

      var triggerType = configs.getTriggerType();
      var triggerFrequency = configs.getTriggerFrequency();

      var newTrigger = ScriptApp.newTrigger('run');

      if (triggerType == 'Day') {
        newTrigger = newTrigger.timeBased().everyDays(triggerFrequency);

        if (triggerFrequency == 1) {
          scheduleMessage += 'day';
        } else {
          scheduleMessage += triggerFrequency + ' days';
        }
      } else if (triggerType == 'Hour') {
        newTrigger = newTrigger.timeBased().everyHours(triggerFrequency);

        if (triggerFrequency == 1) {
          scheduleMessage += 'hour';
        } else {
          scheduleMessage += triggerFrequency + ' hours';
        }
      } else if (triggerType == 'Minute') {
        newTrigger = newTrigger.timeBased().everyMinutes(triggerFrequency);

        if (triggerFrequency == 1) {
          scheduleMessage += 'minute';
        } else {
          scheduleMessage += triggerFrequency + ' minutes';
        }
      }

      newTrigger.create();

      sheetDAO.setValues('Config', 'D3', [[scheduleMessage]]);
    } catch (error) {
      sheetDAO.setValues('Config', 'D3', [
        [
          "An error occurred, please review triggers through menu Tools -> Script Editor -> Triggers"
        ]
      ]);
    }
  }
}
