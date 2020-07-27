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

function myFunction() {
  var dao = new DVDAO();

  console.log(dao.getLineItem(1395040, 9326866));
}

function run() {
  var sheetDAO = new SheetDAO();
  var activity = sheetDAO.getValues('Status', 'A4:B');

  new WeatherGov('Weather').refresh();

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
