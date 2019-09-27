var basicFilters = {
    service: "pdFilterServices",
    user:    "pdFilterUsers",
    team:    "pdFilterTeams",
};

var storageDefaults = {
    pdAccountSubdomain: '',
    pdAPIKey: '',
    pdIncludeLowUrgency: false,
    pdRemoveButtons: false,
    pdOpenOnAck: false,
    pdNotifSound: false,
    pdRequireInteraction: false,
    pdShowBadgeUpdates: false,
    pdBadgeLocation: 'triggered',
    pdAdvancedFilter: '',
};

for (var filter in basicFilters)
    storageDefaults[basicFilters[filter]] ='';
