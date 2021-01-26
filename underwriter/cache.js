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
 * Object cache
 */
var Cache = function() {

  // Holds cache keys and values
  var cache = {};

  /**
   * Gets and item from the cache by key, if key not found returns null
   *
   * params:
   *  key: Unique cache key
   *
   * returns: Object identified by the key
   */
  this.get = function(key) {
    if(cache[key]) {
      return cache[key];
    }

    return null;
  }

  /**
   * Sets a value to the cache
   *
   * params:
   *  key: unique identifier for the cache
   *  value: value to be set
   */
  this.set = function(key, value) {
    cache[key] = value;
  }
}

var cache = null;

function getCache() {
  if(!cache) {
    cache = new Cache();
  }

  return cache;
}
