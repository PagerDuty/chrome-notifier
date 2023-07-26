import PDAPI from '../lib/pd-api.js';
// These functions will allow us to validate the API access, so people can self-debug any incorrect credentials.

// Should be exactly 20 chars long.
function isKeyFormatValid() {
    e = getElement('api-key');
    return (e.value == "" || e.value.length == 20);
}

// Status message updater helpers.
function statusError(message = '') {
    getElement('access-status').className = 'ko';
    getElement('access-status').innerHTML = '&#x2717; ' + message;
}

function statusOK(message = '') {
    getElement('access-status').className = 'ok';
    getElement('access-status').innerHTML = '&#x2713; ' + message;
}

function statusWarning(message = '') {
    getElement('access-status').className = 'warn';
    getElement('access-status').innerHTML = '&#x26a0; ' + message;
}

function validateAPIKeyAccess(apiKey) {
    // Validate if they can access v2 API endpoint using API Key.
    var v2api = new PDAPI(apiKey);
    try {
        v2api.GET('https://api.pagerduty.com/users?limit=1',

            // If so, the API key is valid (for either v1 or v2)
            function success(data) {
                statusOK();
            },

            // If we get to here, then API key is invalid (or not supplied). Validate if cookie auth is working.
            function error(status, data) {
                // Don't pass an API key, will attempt cookie auth using their subdomain.
                var v1api = new PDAPI('', 1);
                v1api.GET('https://' + getElement('account-subdomain').value + '.pagerduty.com/api/v1/users?limit=1',
                    function success(data) {
                        // If HTTP200 and 2007 error code returned, then subdomain is invalid. Flag that up.
                        try {
                            if (data.error.code == 2007) { statusError("Account not valid, check subdomain"); return; }
                        }
                        catch (e) { }

                        // Otherwise, cookie auth is good.
                        statusWarning("Invalid API key! (Cookie auth is OK)");
                    },
                    function error(status, data) {
                        // Cookie auth was bad, enumerate the reasons.
                        if (status == 401) { statusError("Invalid API key! (Not logged in for cookie auth)"); return; }
                        if (status == 403) { statusError("API key valid, but you are not authorized to access the API"); return; }
                        if (status == 404) { statusError("Account not valid, check subdomain"); return; }
                        statusError("Access Denied (" + status + "). Unable to access using API key or cookie auth");
                    });
            });
    }
    catch (e) {
        statusError("Invalid API key! (Contains invalid chars?)");
    }
}

// Add ability to validate API key access, so people can test themselves.
document.getElementById('api-validate').addEventListener('click', function () {
    // Clear any old status
    getElement('access-status').className = 'loading';
    getElement('access-status').innerHTML = '';

    // If API key in field is new, use that.
    if (!isAPIKeyObfuscated(getElement('api-key').value)) {
        validateAPIKeyAccess(getElement('api-key').value);
        return;
    }

    // Otherwise, use the API key we have in storage.
    chrome.storage.sync.get(
        {
            pdAPIKey: '',
        },
        function (items) {
            validateAPIKeyAccess(items.pdAPIKey);
        });
});
