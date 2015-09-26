console.log("Background");
// Why the fuck doesn't chrome.notifications have a .get(id) method?
// Fuck it, just store ourselves for now.
var _notifications = new Object();

// This will listen for messages from the content script, and trigger a new desktop notification.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse)
  {
    console.log("Background message received", request);
    // Only listen for pagerduty_notification, ignore others.
    if (!request.type || request.type !== "pagerduty_notification") { return; }
    if (!request.data) { return; }

    chrome.notifications.create(request.data.incidentId,
    {
      type: "basic",
      title: request.data.incidentTitle,
      message: request.data.incidentDescription,
      iconUrl: chrome.extension.getURL("img/icon-256.png"),
      priority: 2,
      isClickable: true,
      contextMessage: request.data.incidentDomain,
      buttons: [
        { title: "Acknowledge" },
        { title: "Resolve" }
      ]
    });

    // SUPERHACK: Update our internal list
    _notifications[request.data.incidentId] = request.data;

    return true;
   }
);

// Add event handlers for button clicks.
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex)
{
  console.log("button clicked");
  var notif = _notifications[notificationId];
  switch (buttonIndex)
  {
    case 0: // Acknowledge
      console.log("Acknowledging incident", notif);

      // This is a really hacky way to do this, but fuck it, works for now.
      chrome.tabs.query({url: "https://*.pagerduty.com/*"}, function(tabs)
      {
        chrome.tabs.sendMessage(tabs[0].id,
        {
          "type": "pagerduty_acknowledge",
          "data": notif
        });
      });
      break;

    case 1: // Resolve
      console.log("Resolving incident", notif);
      chrome.tabs.query({url: "https://*.pagerduty.com/*"}, function(tabs)
      {
        chrome.tabs.sendMessage(tabs[0].id,
        {
          "type": "pagerduty_resolve",
          "data": notif
        });
      });
      break;
  }
});

// Add event handler for when a notification is clicked.
chrome.notifications.onClicked.addListener(function(notificationId)
{
  window.open(_notifications[notificationId].incidentUrl);
});
