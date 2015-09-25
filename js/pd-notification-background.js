
// This will listen for messages from the content script, and trigger a new desktop notification.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse)
  {
    chrome.notifications.create(
      request.incidentId,
      {
        type: "basic",
        title: request.incidentTitle,
        message: request.incidentDescription,
        iconUrl: chrome.extension.getURL("img/icon-256.png"),
        priority: 2,
        isClickable: true,
        contextMessage: request.incidentUrl,
        buttons: [
          {
            title: "Acknowledge"
          },
          {
            title: "Resolve"
          }
        ]
      }
    );
   }
);

// Add event handlers for button clicks.
// TODO this doesn't work.
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex)
{
  console.log('notif = ' + notificationId + ', button=' + buttonIndex);
});

// Add event handler for when a notification is clicked.
// TODO this doesn't work.
chrome.notifications.onClicked(function(notificationId)
{
    console.log("clicked", notificationId);
});
