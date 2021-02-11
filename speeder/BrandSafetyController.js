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

var QA_TAB = "QA";

/**
  * Apply Brand Safety Controls to ALL the line items in the QA tab or ONLY to the specified line item list in the 'Line Items For ${brandControlsType}' tab.
*/
function applyBrandSafetyControlsConfiguration() {
  var sheet = new SheetDAO();
  var qaData = sheet.sheetToDict(QA_TAB);
  var bscConfigurationService = new BrandSafetyControlsConfigurationService();
  // Updates qaData reference.
  bscConfigurationService.applyBrandSafetyControlsConfiguration(sheet, qaData);
  setChangesToSheet(sheet, QA_TAB, qaData);
}

/**
  * Write changes to a specific sheet.
  * params:
  *   sheet: sheet DAO to handle reading and writing in the sheet.
  *   sheetName: Name of the sheet to write to.
  *   data: the data to write in the sheet.
*/
function setChangesToSheet(sheet, sheetName, data) {
  sheet.dictToSheet(sheetName, data);
}

var BrandSafetyControlsConfigurationService = function() {

  /* PUBLIC METHODS */

  var STATUS_UNCHANGED = "UNCHANGED";
  var STATUS_MODIFIED = `%s MODIFIED`;
  var LINE_ITEM_ID_LABEL = "Line Item ID";
  var LI_KEYWORD_INCLUSIONS_TAB_NAME = "Line Items For Keyword Inclusions";
  var LI_KEYWORD_EXCLUSIONS_TAB_NAME = "Line Items For Keyword Exclusions";
  var LI_TO_MODIFY_KEY = "lineItemsToModify";
  var LI_TO_MODIFY_TAB_NAME_KEY = "lineItemsToModifyTabName";
  var NEW_KEYWORDS_TO_ADD_KEY = "newKeywordsToAdd";
  var STATUS_HEADER = "Status";
  var LINE_ITEMS_HEADER = "Line Items";

  /**
    * Apply Brand Safety Controls to ALL the line items in the QA tab or ONLY to the specified line item list in the 'Line Items For ${brandControlsType}' tab.
  */
  this.applyBrandSafetyControlsConfiguration = function(sheet, qaData) {
    var brandSafetyControlsConfiguration = buildParametersForBrandSafetyControlsConfiguration(sheet);
    qaData.forEach(row => {
      var qaLineItem = row[LINE_ITEM_ID_LABEL];
      var modifiedBrandSafetyControls = [];
      for(var brandSafetyControlsType in brandSafetyControlsConfiguration) {
        var oldKeywordsStr = row[brandSafetyControlsType];
        var oldKeywords = oldKeywordsStr.split(",");
        if(oldKeywords.length === 1 && !oldKeywords[0]) {
          // avoid adding empty keyword
          oldKeywords = [];
        }
        var config = brandSafetyControlsConfiguration[brandSafetyControlsType]
        var lineItemsToModify = config[LI_TO_MODIFY_KEY];
        if(modifyLineItem(lineItemsToModify, qaLineItem)) {
          var newKeywordsToAdd = oldKeywords.concat(config[NEW_KEYWORDS_TO_ADD_KEY]);
          row[brandSafetyControlsType] = newKeywordsToAdd.join(",");
          modifiedBrandSafetyControls.push(brandSafetyControlsType)
        }
      }
      row[STATUS_HEADER] = modifiedBrandSafetyControls.length > 0 ? STATUS_MODIFIED.replace("%s", modifiedBrandSafetyControls.join(", ")) : STATUS_UNCHANGED;
    });
  }

  /* PRIVATE METHODS */

  /**
    * Build the brand safety controls configuration template.
  */
  function getConfigurationTemplate() {
    return {
      "Keyword Inclusions" : {
        "newKeywordsToAdd": [],
        "lineItemsToModifyTabName": LI_KEYWORD_INCLUSIONS_TAB_NAME,
        "lineItemsToModify": []
      },
      "Keyword Exclusions" : {
        "newKeywordsToAdd": [],
        "lineItemsToModifyTabName": LI_KEYWORD_EXCLUSIONS_TAB_NAME,
        "lineItemsToModify": []
      }
    }
  }

  /**
    * Build the brand safety controls configuration template that will include the required parameters for the setting.
    * 1. The new keywords to add.
    * 2. The specific line items to add the keywords to. If the array length is zero, the keywords will be applied to ALL the line items in the QA tab.
    * params:
    * sheet: sheet DAO to handle reading and writing in the sheet.
  */
  function buildParametersForBrandSafetyControlsConfiguration(sheet) {
    var configurationTemplate = getConfigurationTemplate();
    for(var bscConfigType in configurationTemplate) {
      var config = configurationTemplate[bscConfigType];
      var newKeywordsData = sheet.sheetToDict(bscConfigType);
      var newKeywordsToAdd = objectListToArray(newKeywordsData, bscConfigType);
      var lineItemsToModifyData = sheet.sheetToDict(config[LI_TO_MODIFY_TAB_NAME_KEY]);
      var lineItemsToModify = objectListToArray(lineItemsToModifyData, LINE_ITEMS_HEADER);
      config[NEW_KEYWORDS_TO_ADD_KEY] = newKeywordsToAdd;
      config[LI_TO_MODIFY_KEY] = lineItemsToModify
    }
    return configurationTemplate;
  }

  /**
    * Evaluate if a line item should be modified.
    * Rules to modify line items:
    *   1. There are NO line items in the 'Line Items For ${brandControlsType}' tab, which means that the brand safety controls will be applied to ALL the line items in the QA tab.
    *   2. Or the line item currently being evaluated is included in the 'Line Items For ${brandControlsType}' tab.
    * Only if either of the conditions above is met, the line items will be modified, otherwise they will remain unchanged.
    * params:
    *  lineItemsToModify: list of line items from the 'Line Items For ${brandControlsType}' tab.
    *  qaLineItem: current line item being evaluated for modification.
  */
  function modifyLineItem(lineItemsToModify, qaLineItem) {
    return lineItemsToModify.length === 0 || lineItemFound(lineItemsToModify, qaLineItem)
  }

  /**
    * Evaluate if a line item exists in the line item list from the 'Line Items For ${brandControlsType}' tab.
    * params:
    *  lineItemsToModify: list of line items from the 'Line Items For ${brandControlsType}' tab.
    *  qaLineItem: current line item being evaluated for modification.
  */
  function lineItemFound(lineItemsToModidy, qaLineItem) {
    var liFound = lineItemsToModidy.filter(li => {
      return li === qaLineItem;
    })
    return liFound.length === 1;
  }

  /**
    * Convert a list of objects to a plain list.
    * params:
    *  objList: the object list to be transformed to a plain list.
    *  keywordsType: the type of brand safety elements contained in the objList.
  */
  function objectListToArray(objList, keywordsType) {
    var array = objList.map(element => element[keywordsType]);
    return array;
  }
}