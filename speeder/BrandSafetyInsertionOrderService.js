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

/**
 * Brand Safety Controls Insertion Order Service
 */
var BrandSafetyInsertionOrderService = function (dvDAO) {

    this.tabName = constants.QA_TAB_NAME;
    this.keys = [constants.ADVERTISER_ID_HEADER, constants.INSERTION_ORDER_ID_HEADER];

    BaseLoader.call(this, dvDAO);

    /**
     * Identify items to be loaded based on values in defined by the user in the
     * entity's respective tab.
     *
     * params:
     *   job: The job passed by the sidebar
     *   job.itemsToLoad: Is populated with the items from DV that need to be
     *   loaded
     */
    this.identifyItemsToLoad = function (job) {
        var feedProvider = new FeedProvider(this.tabName, this.keys).load();
        job.itemsToLoad = [];
        job.idField = 'insertionOrderId';

        var feedItem = null;
        while (feedItem = feedProvider.next()) {
            var io = dvDAO.getInsertionOrder(feedItem[constants.ADVERTISER_ID_HEADER], feedItem[constants.INSERTION_ORDER_ID_HEADER]);
            if (io) {
                job.itemsToLoad.push(io)
            }
        }

        return job;
    }

    /**
     * Generates the QA report and writes to the sheet.
     *
     * params:
     *  job: The job passed by the UI
     *  job.itemsToLoad: list of DV360 IOs to load
     */
    this.generateQAReport = function (job) {
        var feed = [];

        forEach(job.itemsToLoad, function (index, insertionOrder) {
            var feedItem = {};

            feedItem[constants.ADVERTISER_ID_HEADER] = insertionOrder.advertiserId;
            feedItem[constants.INSERTION_ORDER_ID_HEADER] = insertionOrder.insertionOrderId;
            feedItem[constants.INSERTION_ORDER_NAME_HEADER] = insertionOrder.displayName;

            feed.push(feedItem);
        });

        new FeedProvider(this.tabName, this.keys).setFeed(feed).save();

        return job;
    }
}