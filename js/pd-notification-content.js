
// This will trigger a PagerDuty desktop notification.
function triggerNotification(incidentId, title, description)
{
  console.log("Triggering notificaiton");

  chrome.runtime.sendMessage({
    "incidentId": incidentId,
    "incidentTitle": title,
    "incidentDescription": description,
    "incidentTime": Date.now()
  });
}

triggerNotification(123, 'test', 'testing 123');
