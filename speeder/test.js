function loadKeywordsToQA() {
  var sheet = new SheetDAO();
  var keywordsType = "Keyword Inclusions";
  var qaData = sheet.sheetToDict("QA");
  //var lineItemsData = sheet.sheetToDict("Line Items KI");
  //var len = Object.keys(lineItemsData).length;
  var newKeywordsData = sheet.sheetToDict(keywordsType);
  var newKeywordsToAdd = objectListToArray(newKeywordsData, keywordsType);
    
  qaData.forEach(row => {
    var oldKeywordsStr = row[keywordsType];
    var oldKeywords = oldKeywordsStr.split(",");
    if(oldKeywords.length === 1 && !oldKeywords[0]) {
      return;
    }
    var newKeywords = newKeywordsToAdd.filter(k => {
      return oldKeywords.indexOf(k) === -1
    });
    var removedKeywords = oldKeywords.filter(k => {
      return newKeywordsToAdd.indexOf(k) === -1
    });

    if(row[keywordsType] !== '') {
      row[keywordsType] = newKeywordsToAdd.join(", ");
    }
  });
  sheet.dictToSheet("QA", qaData);
}

function objectListToArray(objList, keywordsType) {
  var array = objList.map(element => element[keywordsType]);
  return array;
}



/**
  * Load Keyword Inclusions and Keyword Exclusions to the specified sheet and range
  *
  * params:
  *  sheetName: Name of the sheet where to write
  *  range: range in which to write
  *  values: array of arrays containing values to write
*/
function loadKeywordsToSpecificSheets() {
  var sheet = new SheetDAO();
  var qaData  = sheet.sheetToDict("QA");
  loadKeywordsToSheet(sheet, qaData, "Keyword Inclusions");
  loadKeywordsToSheet(sheet, qaData, "Keyword Exclusions");
}

/**
  * Load keywords to the specified sheet and range
  *
  * params:
  * sheet: sheet DAO to handle reading and writing in the sheet
  * qaData: A dict of all the data coming from the QA tab
  * keywordsType: Either Keyword Inclusions or Keyword Exclusions label
*/
function loadKeywordsToSheet(sheet, qaData, keywordsType) {
  var keywords = getKeywordsForSheet(qaData, keywordsType);
  sheet.dictToSheet(keywordsType, keywords);
}

/**
  * Get the keywords from a specified sheet and range
  *
  * params:
  * qaData: A dict of all the data coming from the QA tab
  * keywordsType: Either Keyword Inclusions or Keyword Exclusions label
*/
function getKeywordsForSheet(qaData, keywordsType) {
  var lineItemKeywords = filterLineItemKeywords(qaData, keywordsType);
  var totalKeywords = [];
  lineItemKeywords.forEach(row => {
    var keywordsArray = row[keywordsType].split(',');
    totalKeywords = totalKeywords.concat(keywordsArray);
  });
  var uniqueKeywords = new Set(totalKeywords);
  var keywordsForSheet = [];
  for (let ki of uniqueKeywords) {
    var keywordsTypeObj = {};
    keywordsTypeObj[keywordsType] = ki.trim();
    keywordsForSheet.push(keywordsTypeObj);
  } 
  return keywordsForSheet;
}

function filterLineItemKeywords(qaData, keywordsType) {
  var lineItemKeywords = qaData.filter((data) => {
    return data[keywordsType];
  });
  return lineItemKeywords;
}
