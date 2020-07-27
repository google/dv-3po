
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
