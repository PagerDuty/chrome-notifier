// Simple script to poll PagerDuty API for new incidents, and trigger a Chrome notification for
// any it finds. Will also give user ability to ack/resolve incidents right from the notifs.

// TODO use chrome.alarms instead??

// Configuration
var _pdUserAgent = "pd-chrome-notifier-0.1"; // Will be in the X-Requested-With header of requests.

// Helper wrappers for HTTP methods.
function HTTP()
{
    this.GET = function GET(url, callback)
    {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("X-Requested-With", _pdUserAgent);
        xhr.onreadystatechange = function()
        {
            if (xhr.readyState == 4)
            {
                try
                {
                    callback(JSON.parse(xhr.responseText));
                }
                catch(e)
                {
                    // Ignore any parsing errors and carry on.
                }
            }
        };
        xhr.send();
    }

    this.PUT = function PUT(url)
    {
        var xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);
        xhr.setRequestHeader("X-Requested-With", _pdUserAgent);
        xhr.send();
    }
}

function PagerDutyNotifier()
{
    // Members
    var self = this; // Self-reference

    self.account          = "";    // The PagerDuty account subdomain to check.
    self.apiKey           = "";    // Optional API key to not require active session.
    self.pollInterval     = 15;    // Number of seconds between checking for new notifications.
    self.includeLowUgency = false; // Whether to include low urgency incidents.

    self.http   = new HTTP(); // Helper for HTTP calls.
    self.poller = null;       // This points to the interval function so we can clear it if needed.

    // Ctor
    self._construct = function _construct()
    {
        self.setupPoller();
        self.setupEventHandlers();
        self.loadConfiguration();
    }

    // This loads any configuration we have stored with chrome.storage
    self.loadConfiguration = function loadConfiguration()
    {
        chrome.storage.sync.get(
        {
            pdAccountSubdomain: '',
            pdAPIKey: null,
            pdPollInterval: 15,
            pdIncludeLowUrgency: false
        },
        function(items)
        {
            self.account          = items.pdAccountSubdomain;
            self.apiKey           = items.pdAPIKey;
            self.pollInterval     = items.pdPollInterval;
            self.includeLowUgency = items.pdIncludeLowUrgency;
        });
    }

    // This will set up the poller process.
    self.setupPoller = function setupPoller()
    {
        self.poller = setInterval(function() { self.pollNewIncidents(); }, self.pollInterval * 1000);
        self.pollNewIncidents();
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
        chrome.notifications.create(incident.id,
        {
            type: "basic",
            iconUrl: chrome.extension.getURL("img/icon-256.png"),
            title: incident.trigger_summary_data.subject,
            message: "Service: " + incident.service.name,
            contextMessage: incident.urgency.charAt(0).toUpperCase() + incident.urgency.slice(1) + " Urgency",
            // incident.html_url.replace('https://','').split(/[/?#]/)[0],
            priority: 2,
            isClickable: true,
            buttons: [
                { title: "Acknowledge" },
                { title: "Resolve" }
            ]
        });
    }

    self._construct();
}

var _pdNotifier = new PagerDutyNotifier();
