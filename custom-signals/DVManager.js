var DVManager = function() {
  var dao = new DVDAO();

  var fetchers = [
      new IdFetcher(dao)
  ];

  var fieldHandlers = [
      new ActiveFieldHandler(),
      new FixedBidFieldHandler()
  ];

  var sheetDAO = getSheetDAO();

  function getFeed() {
    return sheetDAO.sheetToDict('Rules');
  }

  function uniquefy(list, uniqueField) {
    var map = {};
    var result = [];

    for(var i = 0; i < list.length; i++) {
      var item = list[i];
      var key = item[uniqueField];

      map[key] = item;
    }

    var keys = Object.getOwnPropertyNames(map);

    for(var i = 0; i < keys.length; i++) {
      var key = keys[i];

      result.push(map[key]);
    }

    return result;
  }

  function fetch(feed) {
    var result = [];

    for(var i = 0; i < fetchers.length; i++) {
      var fetcher = fetchers[i];

      result = result.concat(fetcher.fetch(feed));
    }

    return uniquefy(result, 'lineItemId');
  }

  this.update = function() {
    var feed = getFeed();
    var updates = fetch(feed);
    var activity = [];

    each(updates, function(update) {
      var updateMask = [];

      each(fieldHandlers, function(fieldHandler) {
        fieldHandler.handle(update.feedItem, update.lineItem, updateMask);
      });

      if (updateMask.length) {
        dao.patchLineItem(update.lineItem, updateMask.join(','));
        activity.push([
          new Date(),
          'Updating LI ' + update.lineItem.displayName + ' (' + update.lineItem.lineItemId + ')'
        ]);
      }
    });

    return activity;
  }

}
