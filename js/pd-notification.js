console.log("Injected script");
// This script is injected into the PagerDuty dashboard page, and will trigger the PagerDuty
// desktop notifications using the pagerduty-chrome-notification extension.

var _pdCheckInterval = 1000; // Number of milliseconds between checks for new notifs.
var _pdIgnoreLimit   = 9999999; // Number of seconds after which an incident is raised to not send notif.

// Trigger notifications for any events that are within the last _pdIgnoreLimit seconds, and not
// already triggered. So we don't trigger for everything when page reloads, etc.
function checkForNewIncidentNotifications()
{
  var _incidents = app.view.incidentTable.collection.models;
  for (var i in _incidents)
  {
    // Ignore if we've already notified this session.
    if (_incidents[i].notified) { continue; }

    // Ignore unless in triggered state.
    if (_incidents[i].attributes.status !== "triggered") { continue; }

    // If triggered longer than _pdIgnoreLimit ago, then don't notify.
    /*if (_incidents[i].attributes.createdOn.toDate().getTime()
        <= ((new Date()) - _pdIgnoreLimit))
    {
      continue;
    }*/

    // Normalize the incident object into a format our notification tooling expects.
    var incident = {
      "incidentId": _incidents[i].id,
      "incidentTitle": _incidents[i].attributes.summary,
      "incidentDescription": "Service: " + _incidents[i].attributes.service.summary,
      "incidentUrl": _incidents[i].attributes.html_url,
      "incidentUrgency": _incidents[i].attributes.urgency,
      "incidentCreated": _incidents[i].attributes.created_at,
      "incidentDomain": _incidents[i].attributes.html_url.replace('https://','').split(/[/?#]/)[0]
    }

    // Send a message to the extension to trigger the notification.
    console.log("Sending desktop notification for incident", incident)
    _incidents[i].notified = true; // Mark original as notified so we don't trigger more than once.
    window.postMessage({
      "type": "pagerduty_notification",
      "incident": incident
    }, "*");
  }
}

window.addEventListener("message", function(event)
{
  // Sanity checks
  if (event.source != window || !event.data.type) { return; }

  // What we do depends on what the message was...
  switch(event.data.type)
  {
    case "pagerduty_acknowledge":
      acknowledgeIncident(event.data.incident.incidentId);
      break;

    case "pagerduty_resolve":
      acknowledgeIncident(event.data.incident.incidentId);
      break;
  }
});

// Helper method to acknowledge an incident.
function acknowledgeIncident(incidentId)
{
  $.ajax({
    url: '/api/v1/incidents/' + incidentId + '/acknowledge',
    type: 'PUT'
  });
}

// Helper method to resolve an incident.
function resolveIncident(incidentId)
{
  $.ajax({
    url: '/api/v1/incidents/' + incidentId + '/resolve',
    type: 'PUT'
  });
}

// Check every so often.
setInterval(function() { checkForNewIncidentNotifications(); }, _pdCheckInterval);
checkForNewIncidentNotifications();
