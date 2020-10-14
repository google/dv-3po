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
  getUi().createMenu('DV-3PO Underwriter')
      .addItem('Run', 'run')
      .addToUi();
}

function run() {
  var feed = getSheetDAO().sheetToDict('Underwriter');

  each(feed, function(feedItem, index) {
    var ios = getDVDAO().listInsertionOrders(feedItem['Advertiser ID'], 'campaignId=' + feedItem['Campaign ID']).insertionOrders;
    console.log(ios);

    feedItem['Total Budget'] = 0;

    each(ios, function(io, index) {
      console.log(io);
      console.log(io.budget);
      console.log('--------------------------');
      if(io.budget && io.budget.budgetSegments) {
        each(io.budget.budgetSegments, function(budgetSegment, index) {
          console.log(budgetSegment);
          feedItem['Total Budget'] += budgetSegment.budgetAmountMicros / 1000000
        });
      }
    });
  });

  getSheetDAO().dictToSheet('Underwriter', feed);
}

