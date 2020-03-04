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
var DVDAO = function() {

  var service = new DVService().getDVService();

  if(!service.hasAccess()) {
    var t = HtmlService.createTemplateFromFile('Authorization');
    t.authorizationURL = service.getAuthorizationUrl();
    var output = t.evaluate();
    output.setTitle("Authorization");

    SpreadsheetApp.getUi().showSidebar(output);
  }

  this.listQueries = function() {
    var httpOptions = {
      method: "get",
      headers: {
        Authorization: "Bearer " + service.getAccessToken(),
        "Content-Type": "application/json"
      }
      //payload: JSON.stringify(options)
    }

    var response = UrlFetchApp.fetch("https://www.googleapis.com/doubleclickbidmanager/v1.1/queries/", httpOptions);

    if(response.getResponseCode() != 204) {
      throw "Error fetching report " + JSON.stringify(response);
    }

    console.log(response);
  }

}
