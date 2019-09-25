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
    chrome.storage.sync.get(storageDefaults,
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
        for (var filter in basicFilters)
            getFilterElement(filter).value        = items[basicFilters[filter]];
        getElement('show-badge').checked          = items.pdShowBadgeUpdates;

        // Default to "Triggered" for badgeLocation.
        if (items.pdBadgeLocation)
        {
          getElement('option-' + items.pdBadgeLocation).selected = true;
        }
        else
        {
          getElement('option-triggered').selected = true;
        }
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

    // Get the correct badge-location value
    badgeLocation = getElement('badge-location');
    badgeLocation = badgeLocation.options[badgeLocation.selectedIndex].value;

    var save_object = {
        pdAccountSubdomain:   getElement('account-subdomain').value,
        pdIncludeLowUrgency:  getElement('low-urgency').checked,
        pdRemoveButtons:      getElement('remove-buttons').checked,
        pdOpenOnAck:          getElement('open-on-ack').checked,
        pdNotifSound:         getElement('notif-sound').checked,
        pdRequireInteraction: getElement('require-interaction').checked,
        pdShowBadgeUpdates:   getElement('show-badge').checked,
        pdBadgeLocation:      badgeLocation
    }
    for (var filter in basicFilters)
        save_object[basicFilters[filter]] = getFilterElement(filter).value;

    chrome.storage.sync.set( save_object,
    function()
    {
        // Tell the notifier to reload itself with the latest configuration.
        chrome.runtime.getBackgroundPage(function(bgpg)
        {
          bgpg.reloadNotifier();
        });

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

function getFilterElement(filter)
{
    return getElement("filter-" + filter + "s")
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
    } else {
        e.className = "good";
    }

    // API Key should be exactly 20 chars long.
    e = getElement('api-key');
    if (e.value !== ""
        && e.value.length != 20)
    {
        e.className = "bad";
        isValid = false;
    } else {
        e.className = "good";
    }

    // Basic filters shouldn't have any spaces
    var filterUsed = {}
    for (var filter in basicFilters) {
        e = getFilterElement(filter);
        e.value = e.value.replace(/\s+/g, '');
        var filterValid = true;
        filterUsed[filter] = false;
        if (e.value != "") e.value.split(',').forEach(function(item){
            filterUsed[filter] = true;
            if (!item.match( /^P[A-Z0-9]*$/ ))
                filterValid = false;
        });
        if (!filterValid) {
            e.className = "bad";
            isValid = false;
        } else {
            e.className = "good";
        }
    }
    // Pagerduty ingores team filter if service filter is used.
    // Forbid usage of both filters, so users won't be confused.
    if (filterUsed['service'] && filterUsed['team']) {
        isValid = false;
        getFilterElement('service').className = 'bad';
        getFilterElement('team').className = 'bad';
    }

    return isValid;
}
