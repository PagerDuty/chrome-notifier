// This provides all of the logic for handling user configuration of the extension.

// Helper functions to obfuscate the API key on the UI, and detect if it's obfuscated.
function obfuscateAPIKey(key)
{
    if (key == "") { return ""; }
    return "••••••••••••••••" + key.slice(16);
}
function isAPIKeyObfuscated(key)
{
    return key.slice(0, 16) == "••••••••••••••••";
}

// Add an event listener to restore previously save configuration.
document.addEventListener('DOMContentLoaded', function ()
{
    chrome.storage.sync.get(
    {
        // Defaults
        pdAccountSubdomain: '',
        pdAPIKey: '',
        pdIncludeLowUrgency: false,
        pdRemoveButtons: false,
        pdOpenOnAck: false,
        pdNotifSound: false,
        pdRequireInteraction: false,
        pdFilterServices: '',
        pdFilterUsers: '',
        pdShowBadgeUpdates: false
    },
    function(items)
    {
        // Update the page elements appropriately.
        getElement('account-subdomain').value     = items.pdAccountSubdomain;
        getElement('api-key').value               = obfuscateAPIKey(items.pdAPIKey);
        getElement('low-urgency').checked         = items.pdIncludeLowUrgency;
        getElement('remove-buttons').checked      = items.pdRemoveButtons;
        getElement('open-on-ack').checked         = items.pdOpenOnAck;
        getElement('notif-sound').checked         = items.pdNotifSound;
        getElement('require-interaction').checked = items.pdRequireInteraction;
        getElement('filter-services').value       = items.pdFilterServices;
        getElement('filter-users').value          = items.pdFilterUsers;
        getElement('show-badge').checked          = items.pdShowBadgeUpdates;
    });
});

// Add an event listener to save the current configuration, will validate it first.
document.getElementById('save').addEventListener('click', function ()
{
    if (!validateConfiguration()) { return; }

    // If API key was updated, set it. If still obfuscated, don't.
    if (!isAPIKeyObfuscated(getElement('api-key').value))
    {
        chrome.storage.sync.set({ pdAPIKey: getElement('api-key').value });
    }

    chrome.storage.sync.set(
    {
        pdAccountSubdomain:   getElement('account-subdomain').value,
        pdIncludeLowUrgency:  getElement('low-urgency').checked,
        pdRemoveButtons:      getElement('remove-buttons').checked,
        pdOpenOnAck:          getElement('open-on-ack').checked,
        pdNotifSound:         getElement('notif-sound').checked,
        pdRequireInteraction: getElement('require-interaction').checked,
        pdFilterServices:     getElement('filter-services').value,
        pdFilterUsers:        getElement('filter-users').value,
        pdShowBadgeUpdates:   getElement('show-badge').checked
    },
    function()
    {
        // Tell the notifier to reload itself with the latest configuration.
        chrome.extension.getBackgroundPage().reloadNotifier();

        // Let the user know things saved properly.
        getElement('saved').className = 'saved';
        setTimeout(function() { getElement('saved').className = ''; }, 3000);

        // Remove badge icon if it was previously set.
        if (!getElement('show-badge').checked) { chrome.browserAction.setBadgeText({ text: '' }); }
    });
});

// Wrapper method to get the element of a field from the page.
function getElement(elementId)
{
    return document.getElementById(elementId);
}

// Helper to determine if value is an integer.
function isInteger(value)
{
    var x;
    return isNaN(value) ? !1 : (x = parseFloat(value), (0 | x) === x);
}

// This will validate that our configuration is usable.
function validateConfiguration()
{
    var isValid = true;
    var e = null;

    // Subdomain is required.
    e = getElement('account-subdomain');
    if (e.value == "")
    {
        e.className = "bad";
        isValid = false;
    }

    // API Key should be exactly 20 chars long.
    e = getElement('api-key');
    if (e.value !== ""
        && e.value.length != 20)
    {
        e.className = "bad";
        isValid = false;
    }

    // Filter services shouldn't have any spaces
    e = getElement('filter-services');
    e.value = e.value.replace(/\s+/g, '');
    if (e.value !== ""
        && e.value.indexOf(" ") > -1)
    {
        e.className = "bad";
        isValid = false;
    }


    // Filter users shouldn't have any spaces.
    e = getElement('filter-users');
    e.value = e.value.replace(/\s+/g, '');
    if (e.value !== ""
        && e.value.indexOf(" ") > -1)
    {
        e.className = "bad";
        isValid = false;
    }

    return isValid;
}
