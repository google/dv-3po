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


var BaseFetcher = function() {

}

var IdFetcher = function(DVDAO) {
  BaseFetcher.call(this);

  this.fetch = function(feed) {
    var result = [];
    console.log('in fetcher');

    for(var i = 0; i < feed.length; i++) {
      var feedItem = feed[i];

      var advertiserId = feedItem['Advertiser ID'];
      var lineItemId = feedItem['Line Item ID'];

      if(advertiserId && lineItemId) {
        result.push({
          "feedItem": feedItem,
          "lineItem": DVDAO.getLineItem(advertiserId, lineItemId)
          });
      }
    }

    return result;
  }

}
IdFetcher.prototype = Object.create(BaseFetcher.prototype);
