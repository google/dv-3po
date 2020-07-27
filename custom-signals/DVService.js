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
* Handle the call back from the Oauth2 service provider. This is a part
* of the Oauth2 work flow.
* @param {object} request The http request.
* @return {object} A http response that will be shown to the user.
*/
function authCallbackDV(request) {
  var dvService = new DVService().getDVService();
  return authCallback_(dvService, request);
}

/**
* Handle the call back from the Oauth2 service provider. This is a part
* of the Oauth2 work flow.
* @param {object} service The Oauth2 service.
* @param {object} request The http request.
* @return {object} A http response that will be shown to the user.
*/
function authCallback_(service, request) {
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied! You can close this tab.');
  }
}

var DVService = function() {

  var configs = new Configs();

  /**
  * Clear any tokens stored for the oauth2 service.
  */
  function clearToken() {
    OAuth2.createService('dv')
    .setPropertyStore(PropertiesService.getUserProperties())
    .reset();
  }

  /**
  * Generate a new, or reuse an old, Oauth2 service.
  * @param {string} name The internal name of the service.
  * @param {string} scope The Oauth2 scope.
  * @param {string} callback Name of the Oauth2 callback function.
  * @return {object} A Oauth2 service.
  */
  function getService(name, scope, callback) {

    // Create a new service with the given name. The name will be used when
    // persisting the authorized token, so ensure it is unique within the
    // scope of the property store.
    return OAuth2.createService(name)

      // Set the endpoint URLs, which are the same for all Google services.
      .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
      .setTokenUrl('https://accounts.google.com/o/oauth2/token')

      // Set the client ID and secret, from the Google Developers Console.
      .setClientId(configs.getClientID())
      .setClientSecret(configs.getClientSecret())

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction(callback)

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      // Set the scopes to request (space-separated for Google services).
      .setScope(scope)

      // Below are Google-specific OAuth2 parameters.
      // Sets the login hint, which will prevent the account chooser screen
      // from being shown to users logged in with multiple accounts.
      .setParam('login_hint', Session.getActiveUser().getEmail())

      // Requests offline access.
      .setParam('access_type', 'offline')

      // Forces the approval prompt every time. This is useful for testing,
      // but not desirable in a production application.
      //.setParam('approval_prompt', 'force')
      ;
  }

 /**
  * Generate a new, or reuse an old, Oauth2 service to DV.
  * @return {object} A DV Oauth2 service.
  */
  this.getDVService = function() {
    return getService('dv',
                      'https://www.googleapis.com/auth/display-video https://www.googleapis.com/auth/devstorage.read_write',
                      'authCallbackDV');
  }

  this.reset = function() {
    clearToken();
  }

}


