/*
 * Copyright 2021 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

var EmailService = function () {

    /**
      * Sends an email containing the validation errors to
      * the specified email list
      *
      * params:
      *   partnerId: The partner id received from the validation method.
      *   advertiserId: The advertiser id received from the validation method.
      *   errors: the list of validation errors.
      *   emails: the list of emails to send it to.
    */
    this.sendEmail = function (partnerId, advertiserId, errors, emails) {
        var sheet = new SheetDAO();
        var data = sheet.sheetToDict(constants.TEMPLATE_TAB);
        if (data.length > 0) {
            var dataMap = data[0];
            var subject = buildSubject(dataMap[constants.EMAIL_SUBJECT_HEADER], partnerId, advertiserId);
            var body = buildBody(dataMap[constants.EMAIL_BODY_HEADER], errors);
            var htmlBody = HtmlService.createHtmlOutput(body);
            MailApp.sendEmail({
                to: emails,
                subject: subject,
                htmlBody: htmlBody.getContent(),
            });
        }
    }

    /**
      * Builds the subject for the email.
      * params:
      *   subjectTemplate: The template read from the Template tab.
      *   partnerId: The partner id received from the validation method.
      *   advertiserId: The advertiser id received from the validation method.
    */
    function buildSubject(subjectTemplate, partnerId, advertiserId) {
        if (!partnerId) {
            // set to empty string in case it is null or undefined
            partnerId = '';
        }
        if (!advertiserId) {
            // set to empty string in case it is null or undefined
            advertiserId = '';
        }
        var accountInformation = 'No account information provided';
        if (partnerId && advertiserId) {
            accountInformation = `Partner ${partnerId} - Advertiser ${partnerId}`;
        } else if (partnerId && !advertiserId) {
            accountInformation = `Partner ${partnerId}`;
        } else if (!partnerId && advertiserId) {
            accountInformation = `Advertiser ${advertiserId}`;
        }
        subjectTemplate = subjectTemplate.replace("{{accountInformation}}", accountInformation);
        return subjectTemplate
    }

    /**
      * Builds the body for the email.
      * params:
      *   bodyTemplate: The template read from the Template tab.
      *   errors: the list of validation errors.
    */
    function buildBody(bodyTemplate, errors) {
        var errorsMarkupMap = buildErrorsMarkupMap(errors);
        for (var errorType in errorsMarkupMap) {
            var errorsListMarkup = errorsMarkupMap[errorType];
            bodyTemplate = bodyTemplate.replace(`{{${errorType}}}`, errorsListMarkup);
        }

        return bodyTemplate.replace(/\{\{.*\}\}/g, '');
    }

    /**
      * Builds the validation errors markup map for the email body.
      * params:
      *   errorsMap: A map with the validation errors.
    */
    function buildErrorsMarkupMap(errorsMap) {
        var errorsMarkupMap = {};
        for (var errorType in errorsMap) {
            var errors = errorsMap[errorType];
            var errorsListMarkup = errors.length > 0 ? buildErrorsListMarkup(errorType, errors) : '';
            errorsMarkupMap[errorType] = errorsListMarkup;
        }
        return errorsMarkupMap
    }

    /**
      * Builds the validation errors markup list for the errors markup.
      * params:
      *   errorType: The type of error: {budget, spend, coverage, date}.
      *   errors: the list of validation errors.
    */
    function buildErrorsListMarkup(errorType, errors) {
        errorType = errorType.toUpperCase();
        let errorsListMarkup = `<h4>${errorType} errors</h4>
        <div style="margin: 0px;0px;10px;10px"><ul>`;
        errors.forEach(error => {
            errorsListMarkup += `<li>${error}</li>`
        });
        errorsListMarkup += '</ul></div>';
        return errorsListMarkup
    }
}

/**
 * Singleton implementation for the Email Service
 */
var emailService = null;

function getEmailService() {
    if (!emailService) {
        emailService = new EmailService();
    }
    return emailService
}
