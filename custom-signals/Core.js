function each(list, handler) {
  for(var i = 0; i < list.length; i++) {
    handler(list[i], i);
  }
}

