// Simple script to poll PagerDuty API for new incidents, and trigger a Chrome notification for
// any it finds. Will also give user ability to ack/resolve incidents right from the notifs.

// Helper wrappers for HTTP methods.
function HTTP(apiKey)
{
    // Members
    var self       = this;   // Self-reference
    self.apiKey    = apiKey; // API key used for requests.
    self.userAgent = "pd-chrome-notifier-0.1"; // Will be in the X-Requested-With header of requests.

    // Wrapper for generic XMLHttpRequest stuff
    this.prepareRequest = function prepareRequest(method, url)
    {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader("X-Requested-With", self.userAgent);

        // If we have a valid API key, authenticate using that.
        if (self.apiKey != null && self.apiKey.length == 20)
        {
            xhr.setRequestHeader("Authorization", "Token token=" + self.apiKey);
        }

        return xhr;
    }

    // Perform a GET request, and trigger the callback with the result.
    this.GET = function GET(url, callback)
    {
        var req = self.prepareRequest("GET", url);
        req.onreadystatechange = function()
        {
            if (req.readyState == 4)
            {
                try
                {
                    callback(JSON.parse(req.responseText));
                }
                catch(e)
                {
                    // Ignore any parsing errors and carry on.
                }
            }
        };
        req.send();
    }

    // Fire and forget a PUT request.
    this.PUT = function PUT(url)
    {
        var req = self.prepareRequest("PUT", url);
        req.send();
    }
}

function PagerDutyNotifier()
{
    // Members
    var self              = this;  // Self-reference
    self.account          = "";    // The PagerDuty account subdomain to check.
    self.apiKey           = null;  // Optional API key to not require active session.
    self.pollInterval     = 15;    // Number of seconds between checking for new notifications.
    self.includeLowUgency = false; // Whether to include low urgency incidents.
    self.removeButtons    = false; // Whether or not to unclude the action buttons.
    self.http             = null;  // Helper for HTTP calls.
    self.poller           = null;  // This points to the interval function so we can clear it if needed.

    // Ctor
    self._construct = function _construct()
    {
        // Load in configuration, and then set up everything we need.
        self.loadConfiguration(function()
        {
            self.http = new HTTP(self.apiKey);
            self.setupEventHandlers();
            self.setupPoller();
        });
    }

    // This loads any configuration we have stored with chrome.storage
    self.loadConfiguration = function loadConfiguration(callback)
    {
        chrome.storage.sync.get(
        {
            pdAccountSubdomain: '',
            pdAPIKey: null,
            pdPollInterval: 15,
            pdIncludeLowUrgency: false,
            pdRemoveButtons: false
        },
        function(items)
        {
            self.account          = items.pdAccountSubdomain;
            self.apiKey           = items.pdAPIKey;
            self.pollInterval     = items.pdPollInterval;
            self.includeLowUgency = items.pdIncludeLowUrgency;
            self.removeButtons    = items.pdRemoveButtons;
            callback(true);
        });
    }

    // This will set up the poller process.
    self.setupPoller = function setupPoller()
    {
        self.poller = setInterval(function() { self.pollNewIncidents(); }, self.pollInterval * 1000);
        self.pollNewIncidents();
    }

    // This will stop all polling.
    self.stopPoller = function stopPoller()
    {
        clearInterval(self.poller);
    }

    // This will set up any event handlers we need.
    self.setupEventHandlers = function setupEventHandlers()
    {
        // Add event handlers for button clicks to make the necessary API calls.
        chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex)
        {
            switch (buttonIndex)
            {
                case 0: // Acknowledge
                    self.http.PUT('https://' + self.account + '.pagerduty.com/api/v1/incidents/' + notificationId + '/acknowledge');
                    break;

                case 1: // Resolve
                    self.http.PUT('https://' + self.account + '.pagerduty.com/api/v1/incidents/' + notificationId + '/resolve');
                    break;
            }
        });

        // Add event handler for when a notification is clicked to load the incident in a new tab.
        chrome.notifications.onClicked.addListener(function(notificationId)
        {
            window.open('https://' + self.account + '.pagerduty.com/incidents/' + notificationId);
        });
    }

    // This is the poller action, which will trigger an API request and then pass any incidents
    // it gets to the parsing function.
    self.pollNewIncidents = function pollNewIncidents()
    {
        // Sanity check that an account has been set.
        if (self.account == "") { return; }

        // We only want events triggered since we last polled.
        var since = new Date();
        since.setSeconds(since.getSeconds() - self.pollInterval);

        // Construct the URL
        var url = 'https://' + self.account + '.pagerduty.com/api/v1/incidents?'
                + 'status=triggered&'
                + 'since=' + since.toISOString() + '&';

        // Limit to high urgency if that's all the user wants.
        if (!self.includeLowUgency) { url = url + 'urgency=high&'; }

        // Make the request.
        self.http.GET(url, self.parseIncidents);
    }

    // This will parse the AJAX response and trigger notifications for each incident.
    self.parseIncidents = function parseIncidents(data)
    {
        for (var i in data.incidents) { self.triggerNotification(data.incidents[i]); }
    }

    // This will trigger the actual notification based on an incident object.
    self.triggerNotification = function triggerNotification(incident)
    {
        // Define the buttons to show in the notification. Will be empty if user asked to remove.
        var buttons = self.removeButtons ? [] : [
            {
                title: "Acknowledge",
                iconUrl: chrome.extension.getURL("img/icon-acknowledge.png")
            },
            {
                title: "Resolve",
                iconUrl: chrome.extension.getURL("img/icon-resolve.png")
            }
        ];


        chrome.notifications.create(incident.id,
        {
            type: "basic",
            iconUrl: chrome.extension.getURL("img/icon-256.png"),
            title: incident.trigger_summary_data.subject,
            message: "Service: " + incident.service.name,
            contextMessage: incident.urgency.charAt(0).toUpperCase() + incident.urgency.slice(1) + " Urgency",
            priority: 2,
            isClickable: true,
            buttons: buttons
        });
    }

    self._construct();
}

// This will force a reload of the extension.
function reloadExtension()
{
    _pdNotifier.stopPoller();
    _pdNotifier = new PagerDutyNotifier();
}

var _pdNotifier = new PagerDutyNotifier();
