// Need to access JavaScript objects from the page, so need to inject the script since I only have
// access to the DOM from here, and not to the current JavaScript objects.
var s = document.createElement("script");
s.src = chrome.extension.getURL("js/pd-notification.js");
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.parentNode.removeChild(s);
};

// Listen for messages from the page.
window.addEventListener("message", function(event)
{
  // Only accept pagerduty_notification events that we triggered.
  if (event.source != window
      || !event.data.type
      || event.data.type != "pagerduty_notification")
  {
    return;
  }

  // Send the incident to the background process to trigger the actual notification.
  chrome.runtime.sendMessage(event.data.incident);
}, false);
