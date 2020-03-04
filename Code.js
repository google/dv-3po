/***********************************************************************
Copyright 2016 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Note that these code samples being shared are not official Google 
products and are not formally supported.
************************************************************************/
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createMenu('DV-3PO')
      .addItem('Mauricio test', 'mauriciodTest')
      .addToUi();
}

// TODO:
//
// Auth for DV360 API
//
// 1. mauriciod@ Create and pull IAR from DV360 API
// 2. coconate@ Pull SDF for given Line Item IDs in Sheet from DV360 API

// Maybe use CacheService.getUserCache()?
// Store IDs in PropertiesService.getUserProperties()? Which is way faster than writing to the Sheet

// Add menu item for:
// Generate...
// Load Data...

// @returns a array of SDFs
function sdfForLineItemIds(lineItemIds) {}

function mauriciodTest() {
  //new DVService().reset();
  new DVDAO().listQueries();
}
