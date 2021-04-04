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
  * Apply Brand Safety Controls to ALL the line items in the QA tab or ONLY
  * to the specified line item list in the 'Line Items For ${brandControlsType}' tab.
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

var BrandSafetyControlsConfigurationService = function () {

  /* PUBLIC METHODS */

  /**
    * Apply Brand Safety Controls to ALL the line items in the QA tab or ONLY
    * to the specified line item list in the 'Line Items For ${brandControlsType}' tab.
  */
  this.applyBrandSafetyControlsConfiguration = function (sheet, qaData) {
    var brandSafetyControlsConfiguration = buildParametersForBrandSafetyControlsConfiguration(sheet);
    qaData.forEach(row => {
      var qaLineItem = row[constants.LINE_ITEM_ID_HEADER];
      var modifiedBrandSafetyControls = [];
      for (var brandSafetyControlsType in brandSafetyControlsConfiguration) {
        var oldBSItemsStr = row["Original " + brandSafetyControlsType];
        var oldBSItems = oldBSItemsStr.split(",");
        if (oldBSItems.length === 1 && !oldBSItems[0]) {
          // avoid adding empty brand safety item
          oldBSItems = [];
        }
        var config = brandSafetyControlsConfiguration[brandSafetyControlsType]
        var lineItemsToModify = config[constants.LI_TO_MODIFY_KEY];
        if (modifyLineItem(lineItemsToModify, qaLineItem)) {
          if (config[constants.NEW_BS_ITEMS_TO_ADD_KEY].length > 0) {
            var newBSItemsToAdd = missingItems(oldBSItems, config[constants.NEW_BS_ITEMS_TO_ADD_KEY]);
            let uniqueNewBSItemsToAdd = [...new Set(newBSItemsToAdd)];
            row[brandSafetyControlsType] = uniqueNewBSItemsToAdd.join(",");
            if(uniqueNewBSItemsToAdd.length > 0) {
              // Show modified status only if there was a new bs control
              modifiedBrandSafetyControls.push(brandSafetyControlsType);
            }
          }
        }
      }
      row[constants.STATUS_HEADER] = modifiedBrandSafetyControls.length > 0 ?
        constants.STATUS_MODIFIED.replace("%s", modifiedBrandSafetyControls.join(", ")) : constants.STATUS_UNCHANGED;
    });
  }

  /* PRIVATE METHODS */

  /**
   * Returns a list of items of list 2 that are not included in list 1
   *
   * Params:
   *  list1: Array of strings
   *  list2: Array of strings
   *
   * Returns: Array of strings of items in list 2 that are not included in list 1
   */
  function missingItems(list1, list2) {
    var result = [];
    list2.forEach(item => {
      if (list1.indexOf(item) == -1) {
          result.push(item);
      }
    });
    return result;
  }

  /**
    * Build the brand safety controls configuration template.
  */
  function getConfigurationTemplate() {
    var supportedTargetingOptions = getTargetingOptionsBuilder().getSupportedTargetingOptions();
    var configurationTemplate = {};
    supportedTargetingOptions.forEach(supportedTO => {
      switch (supportedTO) {
        case constants.TARGETING_TYPE_KEYWORD:
          configurationTemplate[constants.KEYWORD_INCLUSIONS_HEADER] = getBasicTemplateConfiguration(constants.LI_KEYWORD_INCLUSIONS_TAB_NAME)
          configurationTemplate[constants.KEYWORD_EXCLUSIONS_HEADER] = getBasicTemplateConfiguration(constants.LI_KEYWORD_EXCLUSIONS_TAB_NAME)
          break;
        case constants.TARGETING_TYPE_SENSITIVE_CATEGORY_EXCLUSION:
          configurationTemplate[constants.SENSITIVE_CATEGORIES_HEADER] = getBasicTemplateConfiguration(constants.LI_SENSITIVE_CATEGORY_EXCLUSIONS_TAB_NAME)
          break;
        default:
          break;
      }
    });
    return configurationTemplate
  }

  /**
   * Build the basic brand safety controls configuration template.
   * Params:
   *  tabName: The tab name to get the line items list from
  */
  function getBasicTemplateConfiguration(tabName) {
    return {
      "newBSItemsToAdd": [],
      "lineItemsToModifyTabName": tabName,
      "lineItemsToModify": []
    }
  }

  /**
    * Build the brand safety controls configuration template that will include
    * the required parameters for the setting.
    * 1. The new Brand Safety items to add.
    * 2. The specific line items to add the Brand Safety items to. If the array
    * length is zero, the Brand Safety items will be applied to ALL the line items
    * in the QA tab.
    * params:
    *  sheet: sheet DAO to handle reading and writing in the sheet.
  */
  function buildParametersForBrandSafetyControlsConfiguration(sheet) {
    var configurationTemplate = getConfigurationTemplate();
    for (var bscConfigType in configurationTemplate) {
      var config = configurationTemplate[bscConfigType];
      var newBSItemsData = sheet.sheetToDict(bscConfigType);
      var newBSItemsToAdd = objectListToArray(newBSItemsData, bscConfigType);
      var lineItemsToModifyData = sheet.sheetToDict(config[constants.LI_TO_MODIFY_TAB_NAME_KEY]);
      var lineItemsToModify = objectListToArray(lineItemsToModifyData, constants.LINE_ITEMS_HEADER);
      config[constants.NEW_BS_ITEMS_TO_ADD_KEY] = newBSItemsToAdd;
      config[constants.LI_TO_MODIFY_KEY] = lineItemsToModify
    }
    return configurationTemplate;
  }

  /**
    * Evaluate if a line item should be modified.
    * Rules to modify line items:
    *   1. There are NO line items in the 'Line Items For ${brandControlsType}' tab,
    * which means that the brand safety controls will be applied to ALL the
    * line items in the QA tab.
    *   2. Or the line item currently being evaluated is included in the 'Line Items
    * For ${brandControlsType}' tab.
    * Only if either of the conditions above is met, the line items will be modified,
    * otherwise they will remain unchanged.
    * params:
    *  lineItemsToModify: list of line items from the 'Line Items For ${brandControlsType}' tab.
    *  qaLineItem: current line item being evaluated for modification.
  */
  function modifyLineItem(lineItemsToModify, qaLineItem) {
    return lineItemsToModify.length === 0 || lineItemFound(lineItemsToModify, qaLineItem)
  }

  /**
    * Evaluate if a line item exists in the line item list from the 'Line Items
    * For ${brandControlsType}' tab.
    * params:
    *  lineItemsToModify: list of line items from the 'Line Items
    * For ${brandControlsType}' tab.
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
    *  brandSafetyItemsType: the type of brand safety elements contained in the objList.
  */
  function objectListToArray(objList, brandSafetyItemsType) {
    var array = objList.map(element => element[brandSafetyItemsType]);
    return array;
  }
}