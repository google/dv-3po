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

/**
 * onOpen handler to display menu
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createMenu('DV-3PO Speeder')
      .addItem('Authenticate', 'authenticate')
      .addItem('Open', 'speeder')
      .addToUi();
}

/**
 * Display sidebar
 */
function speeder() {
  var html = null;

  var html = HtmlService.createTemplateFromFile('ui')
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

