import PDAPI from "./pd-api.js";

// Simple script to poll PagerDuty API for new incidents, and trigger a Chrome notification for
// any it finds. Will also give user ability to ack/resolve incidents right from the notifs.

// Will poll continually at the pollInterval until it's destroyed (_destruct() is called).
export default function PagerDutyNotifier() {
    // Members
    var self = this;  // Self-reference
    self.account = null;  // The PagerDuty account subdomain to check.
    self.apiKey = null;  // Optional API key to not require active session.
    self.pollInterval = 15;    // Number of seconds between checking for new notifications.
    self.includeLowUgency = false; // Whether to include low urgency incidents.
    self.removeButtons = false; // Whether or not to unclude the action buttons.
    self.openOnAck = false; // Whether to open the incident in a new tab when ack-ing.
    self.notifSound = false; // Whether to play a notification sound.
    self.requireInteraction = false; // Whether the notification will require user interaction to dismiss.
    self.filterServices = null;  // ServiceID's of services to only show alerts for.
    self.filterUsers = null;  // UserID's of users to only show alerts for.
    self.filterTeams = null;  // TeamID's of teams to only show alerts for.
    self.pdapi = null;  // Helper for API calls.
    self.poller = null;  // This points to the interval function so we can clear it if needed.
    self.showBadgeUpdates = false; // Whether we show updates on the toolbar badge.
    self.badgeLocation = null;  // Which view should be linked to from the badge icon.

    // Ctor
    self._construct = function _construct() {
        // Load in configuration, and then set up everything we need.
        self.loadConfiguration(function () {
            // If no account set up (first install), then do nothing. User will need to add
            // config. Once they save, a reload will be triggered and things will kick off.
            if (self.account == null || self.account == '') { return; }

            self.pdapi = new PDAPI(self.apiKey);
            self.setupPoller();
        });
    };

    // Dtor
    self._destruct = function _destruct() {
        clearInterval(self.poller);
        self = null;
    };

    // This loads any configuration we have stored with chrome.storage
    self.loadConfiguration = function loadConfiguration(callback) {
        chrome.storage.sync.get(
            {
                pdAccountSubdomain: '',
                pdAPIKey: null,
                pdIncludeLowUrgency: false,
                pdRemoveButtons: false,
                pdOpenOnAck: false,
                pdNotifSound: false,
                pdRequireInteraction: false,
                pdFilterServices: null,
                pdFilterUsers: null,
                pdFilterTeams: null,
                pdShowBadgeUpdates: false,
                pdBadgeLocation: 'triggered',
            },
            function (items) {
                self.account = items.pdAccountSubdomain;
                self.apiKey = items.pdAPIKey;
                self.includeLowUgency = items.pdIncludeLowUrgency;
                self.removeButtons = items.pdRemoveButtons;
                self.openOnAck = items.pdOpenOnAck;
                self.notifSound = items.pdNotifSound;
                self.requireInteraction = items.pdRequireInteraction;
                self.filterServices = items.pdFilterServices;
                self.filterUsers = items.pdFilterUsers;
                self.filterTeams = items.pdFilterTeams;
                self.showBadgeUpdates = items.pdShowBadgeUpdates;
                self.badgeLocation = items.pdBadgeLocation;
                callback(true);
            });
    };

    // This will set up the poller process.
    self.setupPoller = function setupPoller() {
        self.poller = setInterval(function () { self.polled(); }, self.pollInterval * 1000);
        self.polled();
    };

    // This is the method that's executed on each poll.
    self.polled = function polled() {
        self.pollNewIncidents();
        self.updateToolbarBadge();
    };

    // This will handle the event triggered from clicking one of the notification's buttons.
    self.handlerButtonClicked = function handlerButtonClicked(notificationId, buttonIndex) {
        if (notificationId == 'test') { return; } // Ignore for test notifications.

        switch (buttonIndex) {
            case 0: // Acknowledge
                self.pdapi.PUT(
                    'https://' + self.account + '.pagerduty.com/api/v1/incidents/' + notificationId,
                    '{"incident":{"type":"incident_reference","status":"acknowledged"}}'
                );
                if (self.openOnAck) { self.handlerNotificationClicked(notificationId); }
                break;

            case 1: // Resolve
                self.pdapi.PUT(
                    'https://' + self.account + '.pagerduty.com/api/v1/incidents/' + notificationId,
                    '{"incident":{"type":"incident_reference","status":"resolved"}}'
                );
                break;
        }
        setTimeout(function () { self.updateToolbarBadge(); }, 200); // Force a badge update, so it changes quickly.
    };

    // This will handle the event triggered when clicking on the main notification area.
    self.handlerNotificationClicked = function handlerNotificationClicked(notificationId) {
        if (notificationId == 'test') { return; } // Ignore for test notifications.
        // Open the tab
        chrome.tabs.create({ 'url': 'https://' + self.account + '.pagerduty.com/incidents/' + notificationId });
    };

    // This is the poller action, which will trigger an API request and then pass any incidents
    // it gets to the parsing function.
    self.pollNewIncidents = function pollNewIncidents() {
        // Sanity check that an account has been set.
        if (self.account == '') { return; }

        // We only want events triggered since we last polled.
        var since = new Date();
        since.setSeconds(since.getSeconds() - self.pollInterval);

        // Construct the URL
        var url = 'https://' + self.account + '.pagerduty.com/api/v1/incidents?'
            + 'statuses[]=triggered&'
            + 'since=' + since.toISOString() + '&'
            + 'limit=5&'; // More than this would be silly to show notifications for.
        url = self.includeFilters(url);

        // Make the request.
        self.pdapi.GET(url, self.parseIncidents);
    };

    // Adds filters to a URL we'll be using in a request
    self.includeFilters = function includeFilters(url) {
        // Limit to high urgency if that's all the user wants.
        if (!self.includeLowUgency) { url = url + 'urgencies[]=high&'; }

        // Add a service filter if we have one.
        if (self.filterServices && self.filterServices != null && self.filterServices != "") {
            self.filterServices.split(',').forEach(function (s) {
                url = url + 'service_ids[]=' + s + '&';
            });
        }

        // Add a user filter if we have one.
        if (self.filterUsers && self.filterUsers != null && self.filterUsers != "") {
            self.filterUsers.split(',').forEach(function (s) {
                url = url + 'user_ids[]=' + s + '&';
            });
        }

        // Add a team filter if we have one.
        if (self.filterTeams && self.filterTeams != null && self.filterTeams != "") {
            self.filterTeams.split(',').forEach(function (s) {
                url = url + 'team_ids[]=' + s + '&';
            });
        }

        return url;
    };

    // This will parse the AJAX response and trigger notifications for each incident.
    self.parseIncidents = function parseIncidents(data) {
        for (var i in data.incidents) {
            self.triggerNotification(data.incidents[i]);
        }
    };

    // This will update the icon badge in the toolbar.
    self.updateToolbarBadge = function updateToolbarBadge() {
        if (!self.showBadgeUpdates) {
            chrome.action.setBadgeText({ text: '' });
            return;
        }

        // Check for any triggered incidents at all that follow our filters.
        var url = self.includeFilters('https://' + self.account + '.pagerduty.com/api/v1/incidents?statuses[]=triggered&total=true&');
        self.pdapi.GET(url, function (data) {
            // If there was an error in the response, show "Err" and log it.
            if (data.error != null) {
                console.error("PagerDuty API returned an error while getting the incident count for the toolbar icon.", {
                    api_url: url,
                    error_returned: data.error
                });
                chrome.action.setBadgeText({ text: 'Err.' });
                chrome.action.setBadgeBackgroundColor({ color: [90, 90, 90, 255] });
                return;
            }

            // If there are no incidents, or an error in the response, show nothing on badge.
            if (data.total == null || data.total == 0) {
                chrome.action.setBadgeText({ text: '' });
                return;
            }

            // Otherwise, we have incidents, show the count.
            chrome.action.setBadgeText({ text: '' + data.total });
            chrome.action.setBadgeBackgroundColor({ color: [189, 0, 0, 255] });
        });
    };

    // This will open a tab to the dashboard using the relevant user settings.
    self.openDashboard = function openDashboard() {
        // Determine the correct URL based on user's options.
        let statuses = '';
        switch (self.badgeLocation) {
            case 'open': statuses = '?status=triggered,acknowledged'; break;
            case 'triggered': statuses = '?status=triggered'; break;
            case 'acknowledged': statuses = '?status=acknowledged'; break;
            case 'any': statuses = '?status=acknowledged,triggered,resolved'; break;
        }

        // Open the tab
        chrome.tabs.create({ 'url': 'https://' + self.account + '.pagerduty.com/incidents' + statuses });
    };

    // This will trigger the actual notification based on an incident object.
    self.triggerNotification = function triggerNotification(incident) {
        // Define the buttons to show in the notification. Will be empty if user asked to remove.
        var buttons = self.removeButtons ? [] : [
            {
                title: "Acknowledge",
                iconUrl: chrome.runtime.getURL("images/icon-acknowledge.png")
            },
            {
                title: "Resolve",
                iconUrl: chrome.runtime.getURL("images/icon-resolve.png")
            }
        ];

        chrome.notifications.create(incident.id,
            {
                type: "basic",
                iconUrl: chrome.runtime.getURL("images/icon-256.png"),
                title: incident.summary,
                message: "Service: " + incident.service.summary,
                contextMessage: incident.urgency.charAt(0).toUpperCase() + incident.urgency.slice(1) + " Urgency",
                priority: 0,
                isClickable: true,
                buttons: buttons,
                requireInteraction: self.requireInteraction
            });

        // Trigger notification sound if user wants it.
        if (self.notifSound) {
            self.playNotification();
        }
    };

    // Creates an offscreen document to play the audio notification
    self.playNotification = async function () {
        try {
            if (await chrome.offscreen.hasDocument()) {
                await chrome.offscreen.closeDocument();
                self.playNotification();
                return;
            }
            await chrome.offscreen.createDocument({
                url: chrome.runtime.getURL('../audio/notification.html'),
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Play PagerDuty notification sound',
            });
        } catch (e) {
            // When lots of notifications come in at once
            // they try to create lots of offscreen documents
            // but we can only create one, and that's all we need
        }
    };

    self._construct();
}
