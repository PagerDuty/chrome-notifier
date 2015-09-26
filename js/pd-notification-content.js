console.log("Content page");

// Need to access JavaScript objects from the page, so need to inject the script since I only have
// access to the DOM from here, and not to the current JavaScript objects.
var s = document.createElement("script");
s.src = chrome.extension.getURL("js/pd-notification.js");
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.parentNode.removeChild(s);
};

// Listen for messages from background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse)
  {
    if (!request.type || !request.data) { return; }
    if (!request.data) { return; }

    switch(request.type)
    {
      case "pagerduty_acknowledge":
        console.log("Acknowledging", request.data);
        window.postMessage({
          "type": "pagerduty_acknowledge",
          "incident": request.data
        }, "*");
        break;

      case "pagerduty_resolve":
        console.log("Resolving", request.data);
        window.postMessage({
          "type": "pagreduty_resolve",
          "incident": request.data
        }, "*");
        break;
    }

    return true;
  }
);

// Listen for messages from the page.
window.addEventListener("message", function(event)
{
  // Only accept pagerduty_notification events.
  if (event.source != window
      || !event.data.type
      || event.data.type !== "pagerduty_notification")
  {
    return;
  }

  // Pass message to background.
  chrome.runtime.sendMessage({
    "type": "pagerduty_notification",
    "data": event.data.incident
  });
}, false);
