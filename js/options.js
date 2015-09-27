// This provides all of the logic for handling user configuration of the extension.

// Helper functions to obfuscate the API key on the UI, and detect if it's obfuscated.
function obfuscateAPIKey(key)
{
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
        pdPollInterval: 15,
        pdIncludeLowUrgency: false,
        pdRemoveButtons: false
    },
    function(items)
    {
        // Update the page elements appropriately.
        getElement('account-subdomain').value = items.pdAccountSubdomain;
        getElement('api-key').value           = obfuscateAPIKey(items.pdAPIKey);
        getElement('poll-interval').value     = items.pdPollInterval;
        getElement('low-urgency').checked     = items.pdIncludeLowUrgency;
        getElement('remove-buttons').checked  = items.pdRemoveButtons;
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
        pdAccountSubdomain:  getElement('account-subdomain').value,
        pdPollInterval:      getElement('poll-interval').value,
        pdIncludeLowUrgency: getElement('low-urgency').checked,
        pdRemoveButtons:     getElement('remove-buttons').checked
    },
    function()
    {
        // Force a reload after config is updated so the poller restarts.
        //var bgpg = chrome.runtime.getBackgroundPage();
        //bgpg.reloadExtension();
        chrome.runtime.reload();
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
    
    // Poll interval is required, should be integer, and must be no less than 15.
    e = getElement('poll-interval');
    if (!isInteger(e.value)
        || e.value < 15)
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
    
    return isValid;
}
