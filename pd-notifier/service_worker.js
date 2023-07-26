import PagerDutyNotifier from './lib/pd-notifier.js';

// The currently active notifier object, and accessor.
var _pdNotifier = null;
function getNotifier() { return _pdNotifier; }

// This will reload/trigger the the notifier (and pick up any new configuration options).
function reloadNotifier() {
    if (_pdNotifier != null) { _pdNotifier._destruct(); }
    _pdNotifier = new PagerDutyNotifier();
}

// Listen for Chrome Alarms and retrigger the notifier when one is caught.
chrome.alarms.onAlarm.addListener(function (alarm) {
    reloadNotifier();
});

// Tell the notifier to reload itself with the latest configuration when options changed.
chrome.storage.onChanged.addListener((changes, namespace) => {
    reloadNotifier();
});

// Sets up a Chrome Alarm to retrigger the notifier every so often, to make sure it's always running.
chrome.alarms.create("pagerduty-notifier", { periodInMinutes: 1 });

// Initial run, as alarm won't trigger immediately.
reloadNotifier();

// If this is the first installation, show the options page so user can set up their settings.
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == 'install') {
        chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
    }

    // Add option to clear all notifications to icon context-menu.
    chrome.contextMenus.create({
        title: "Clear all notifications",
        id: "pd_clear_all",
        contexts: ["action"],
        visible: true
    });

    chrome.contextMenus.onClicked.addListener(function (info, tab) {
        if (info.menuItemId === "pd_clear_all") {
            chrome.notifications.getAll(function (notifs) {
                for (var i in notifs) { chrome.notifications.clear(i); }
            });
        }
    });

    // Add option to trigger a test notification popup.
    chrome.contextMenus.create({
        title: "Show test notification",
        id: "pd_test_notification",
        contexts: ["action"],
        visible: true
    });

    chrome.contextMenus.onClicked.addListener(function (info) {
        if (info.menuItemId === "pd_test_notification") {
            _pdNotifier.triggerNotification({
                'id': 'test',
                'summary': 'Test Notification',
                'service': {
                    'summary': 'Test Service'
                },
                'urgency': 'high'
            });
        }
    });
});

// Add event handlers for button/notification clicks, and delegate to the currently active notifier object.
chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
    getNotifier().handlerButtonClicked(notificationId, buttonIndex);
    chrome.notifications.clear(notificationId);
});
chrome.notifications.onClicked.addListener(function (notificationId) {
    getNotifier().handlerNotificationClicked(notificationId);
    chrome.notifications.clear(notificationId);
});

// Add event handler for the toolbar icon click.
chrome.action.onClicked.addListener(function (tab) {
    getNotifier().openDashboard();
});
