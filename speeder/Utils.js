/***************************************************************************
*
*  Copyright 2021 Google Inc.
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

var Utils = function () {

    /**
     * Returns a list of items of list 2 that are not included in list 1
     *
     * Params:
     *  list1: Array of strings
     *  list2: Array of strings
     *
     * Returns: Array of strings of items in list 2 that are not included in list 1
     */
    this.missingItems = function (list1, list2) {
        var result = [];
        list2.forEach(item => {
            if (list1.indexOf(item) == -1) {
                result.push(item);
            }
        });
        return result;
    }

};

/**
 * Singleton implementation for Utils
 */
var utils = null;

function getUtils() {
    if (!utils) {
        utils = new Utils();
    }
    return utils
}