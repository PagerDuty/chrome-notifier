// Saves options to chrome.storage
function save_options()
{
  chrome.storage.sync.set(
  {
    pdAccountId: document.getElementById('account-id').value,
    pdPollInterval: document.getElementById('poll-interval').value,
  },
  function()
  {
    chrome.runtime.reload(); // Force a reload after config is updated.
  });
}

// Restores select box and checkbox state using the preferences already stored.
function restore_options()
{
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
  {
    pdAccountId: '',
    pdPollInterval: 15
  },
  function(items)
  {
    document.getElementById('account-id').value = items.pdAccountId;
    document.getElementById('poll-interval').value = items.pdPollInterval;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
