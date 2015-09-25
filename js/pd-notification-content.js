
// This will trigger a PagerDuty desktop notification.
function triggerNotification(incidentId, title, description)
{
  console.log("Triggering notificaiton");

  chrome.runtime.sendMessage({
    "incidentId": incidentId,
    "title": title,
    "description": description
  });
}

triggerNotification(123, 'test', 'testing 123');
