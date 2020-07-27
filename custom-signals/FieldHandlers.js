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
