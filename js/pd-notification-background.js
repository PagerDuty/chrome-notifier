
// Why the fuck doesn't chrome.notifications have a .get(id) method?
// Fuck it, just store ourselves for now.
var _notifications = new Object();

// This will listen for messages from the content script, and trigger a new desktop notification.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse)
  {
    chrome.notifications.create(request.incidentId,
    {
      type: "basic",
      title: request.incidentTitle,
      message: request.incidentDescription,
      iconUrl: chrome.extension.getURL("img/icon-256.png"),
      priority: 2,
      isClickable: true,
      contextMessage: request.incidentDomain,
      buttons: [
        { title: "Acknowledge" },
        { title: "Resolve" }
      ]
    });

    // SUPERHACK: Update our internal list
    _notifications[request.incidentId] = request;
   }
);

// Add event handlers for button clicks.
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex)
{
  var notif = _notifications[notificationId];
  switch (buttonIndex)
  {
    case 0: // Acknowledge
      console.log("Acknowledging incident", notif);
      acknowledgeIncident(notif.id);
      break;

    case 1: // Resolve
      console.log("Resolving incident", notif);
      // TODO

      break;
  }
});

// Add event handler for when a notification is clicked.
chrome.notifications.onClicked.addListener(function(notificationId)
{
  window.open(_notifications[notificationId].incidentUrl);
});
