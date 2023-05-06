// Config openai api
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "YOU_OPENAI_API_KEY",
});
const openai = new OpenAIApi(configuration);
const promptp1 = "Answer the following question with Yes or No. Has the following website ";
const promptp2 = " been criticized for anti-Islamic views?"


// requestMade will look like {"tabId":[URLs], "nextTabId":[URLs]}
var requestsMade = {};
var blockThese = ["https://www.splcenter.org/", "https://www.donaldjtrump.com/", "*://www.jihadwatch.org/*", "https://eagleforum.org/","https://aifdemocracy.org/", "https://www.davidhorowitzfreedomcenter.org/", "https://www.meforum.org/", "https://www.actforamerica.org/", "https://www.gatestoneinstitute.org/"
, "https://www.centerforsecuritypolicy.org/", "https://www.americanfreedomlawcenter.org/", "https://afdi.us/", "https://americanfreedomalliance.org/", "https://www.afa.net/", "https://theacru.org/", "https://aclj.org/"];
var requestsBlocked = {};

chrome.tabs.onCreated.addListener(function (details) {
  requestsMade[details.id.toString()] = [];
  requestsBlocked[details.id.toString()] = [];
  if (blockThese == null || blockThese.length == 0) {
    ReSync();
  }
});

chrome.tabs.onRemoved.addListener(function (details) {
  // clear the requests made for this tab
  requestsMade[details.toString()] = [];
  for (var prop in requestsMade) {
    if (prop == details.toString()) {
      delete requestsMade[prop];
      break;
    }
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    // Ensuring that we check host names with and without WWW
    var currentHost = new URL(details.url).hostname;
    var withWWW;
    var withoutWWW;
    if (currentHost.indexOf('www.') == -1) {
      withoutWWW = currentHost;
      withWWW = 'www.' + currentHost;
    }
    else {
      withWWW = currentHost;
      withoutWWW = currentHost.substring(4);
    }

    // Load URLs to block for first request
    if (blockThese == null || blockThese.length == 0) {
      ReSync();
    }
    
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: promptp1 + withWWW + promptp2,
    });

    const resultText = completion.data.choices[0].text;
    if (resultText.includes("Yes")) {
      blockThese.push(withWWW);
      blockThese.push(withoutWWW);
    }


    if ((blockThese.indexOf(withWWW) != -1) || (blockThese.indexOf(withoutWWW) != -1)) {
      // block the current URL
      if ((requestsBlocked[details.tabId.toString()].indexOf(currentHost) == -1)) {
        // Add to list
        requestsBlocked[details.tabId.toString()][requestsBlocked[details.tabId.toString()].length] = currentHost;
      }
      return { cancel: true }
      ;
    }

    // If this was first tab, tabs.onCreated would not have been called. So, there won't be anything
    // in requestMade and requestsBlocked.
    if (!requestsMade.hasOwnProperty(details.tabId.toString())) {
      requestsMade[details.tabId.toString()] = [];
      requestsBlocked[details.tabId.toString()] = [];
    }

    if ((requestsMade[details.tabId.toString()].indexOf(currentHost) == -1)) {
      // Add to list
      requestsMade[details.tabId.toString()][requestsMade[details.tabId.toString()].length] = currentHost;
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]);

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  // User opened extension popup
  if (request.action == "requests") {
    callback(GetRequests(request.tab));
  }
  // Some hosts were blocked or unblocked. ReSync blockThese array
  else if (request.action == "resync") {
    callback(ReSync());
  }
});

function GetRequests(tabId) {
  return { "made": requestsMade[tabId.toString()], "blocked": requestsBlocked[tabId.toString()] };
}

function ReSync() {
  chrome.storage.sync.get(['url'], function (result) {
    blockThese = result['url'] ? result['url'] : [];
  });
  // Give it a second to finish loading URLs
  setTimeout(function(){},1000);
}
