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

var BaseFieldHandler = function() {

}

var ActiveFieldHandler = function(DVDAO) {
  BaseFieldHandler.call(this);

  this.handle = function(feedItem, lineItem, updateMask) {
    if (feedItem['Active'] !== '') {
      if (feedItem['Active']) {
        lineItem.entityStatus = 'ENTITY_STATUS_ACTIVE';
      } else {
        lineItem.entityStatus = 'ENTITY_STATUS_PAUSED';
      }

      updateMask.push('entityStatus');
    }
  }
}
ActiveFieldHandler.prototype = Object.create(BaseFieldHandler.prototype);

var FixedBidFieldHandler = function(DVDAO) {
  BaseFieldHandler.call(this);

  this.handle = function(feedItem, lineItem, updateMask) {
    if (feedItem['Fixed Bid'] !== '') {
      lineItem.bidStrategy = {
        'fixedBid': {
          'bidAmountMicros': feedItem['Fixed Bid'] * 1000000
        }
      };

      updateMask.push('bidStrategy.fixedBid.bidAmountMicros');
    }
  }
}
FixedBidFieldHandler.prototype = Object.create(BaseFieldHandler.prototype);
