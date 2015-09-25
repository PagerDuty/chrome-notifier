// Receives messages from our content script in order to trigger notifications.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse)
  {
    chrome.notifications.create(
      'pdincident-' + request.incidentId,
      {
        type: "basic",
        title: request.incidentTitle,
        message: request.incidentDescription,
        eventTime: request.incidentTime,
        iconUrl: chrome.extension.getURL("img/icon-256.png"),
        priority: 2,
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
