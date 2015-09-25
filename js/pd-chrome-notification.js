
// Flag used to determine if notifications are available for this session.
var pdNotificationsEnabled = false;

// This will confirm that notifications are enabled, and permission has been granted.
// If permission has not yet been granted, it will prompt the user to do so.
function setupNotifications()
{
  // Check notification API is available on their browser version.
  if (!Notification)
  {
    console.log("Desktop notifications not available.");
    return
  }

  // If user has not yet made a decision, then prompt them for permission.
  if (Notification.permission !== "granted"
      && Noticiation.permission !== "denied")
  {
    Notification.requestPermission();
  }

  // Only if permission is now granted can we enable notifications.
  pdNotificationsEnabled = (Notification.permission == "granted");
}

// This will trigger a PagerDuty desktop notification.
function triggerNotification(incidentId, title, description)
{
  // Sanity check, don't bother going through the flow if not enabled.
  if (!pdNotificationsEnabled) { return; }

  console.log("Triggering notificaiton");
  var notification = new Notification(
    title,
    {
      icon: "img/icon-256.png",
      body: description
    },
    function()
    {
      window.open("https://pdt-rich.pagerduty.com");
    }
  );
}


setupNotifications();
triggerNotification(123, 'test', 'testing 123');
