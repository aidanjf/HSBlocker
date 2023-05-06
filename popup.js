document.addEventListener('DOMContentLoaded', onLoad);

function onLoad() {

  // Assign click events for pop up buttons
  document.querySelector('#yes').addEventListener('click', Yes);
  document.querySelector('#no').addEventListener('click', No);
  var currentTabId;
  
  // Get the current tab id
  chrome.tabs.query({active: true, currentWindow: true }, function (tabs) {
    currentTabId = tabs[0].id;

    // Get all the requests this tab has made so far
    chrome.runtime.sendMessage({
      action: "requests",
      tab: currentTabId
    },
      function (value) { GetRequests(value) }
    );
  });
}

// build our check box list for current tab and all requests sent so far
function GetRequests(requests) {
  var html = '';
  for (var index = 0; index < requests['made'].length; index++) {
    html = html + '<li><input type="checkbox"> ' + requests['made'][index] + '</li>';
  }
  for (var index = 0; index < requests['blocked'].length; index++) {
    html = html + '<li><input type="checkbox" checked> ' + requests['blocked'][index] + '</li>';
  }
  document.getElementById('hosts').innerHTML = html;
}

function Yes() {

  // There are 3 nested async calls here. First, get the current blocked URLs, then save the new one
  // in its callback. In the call back for save, send resync message to background.js

  chrome.storage.sync.get(["url"], function (result) {
    var array = result['url'] ? result['url'] : [];
    var newItems = [];
    var items = document.getElementsByTagName('li');

    // Iterate through all items. Add checked items to blocked list and remove unchecked ones
    for (var index = 0; index < items.length; index++) {
      if (items[index].firstChild.checked) {
        newItems[newItems.length] = items[index].innerText.trim();
      }
      else {
        // remove if current item exists already
        var currentURL = items[index].innerText.trim();
        var withWWW;
        var withoutWWW;
        if (currentURL.indexOf('www.') == -1) {
          withoutWWW = currentURL;
          withWWW = 'www.' + currentURL;
        }
        else {
          withWWW = currentURL;
          withoutWWW = currentURL.substring(4);
        }
        array.splice(array.indexOf(withWWW));
        array.splice(array.indexOf(withoutWWW));
      }
    }
    var finalValue = array.concat(newItems);
    // Perform save and resync
    chrome.storage.sync.set({ 'url': finalValue }, function () {
      chrome.runtime.sendMessage({
        action: "resync"
      },
        function (value) {
          alert('Settings saved');
          window.close();
        }
      );
    });
  });
}

function No() {
  document.getElementById('hosts').innerHTML = '';
  window.close();
}