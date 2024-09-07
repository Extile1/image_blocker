const toggles = ["Off", "Blank", "Hide", "Url", "Blur"];

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get({"toggle": 0}).then((result) => {
        let toggle = result.toggle;

        chrome.action.setBadgeText({
            text: toggles[toggle]
        });
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.storage.local.get({"toggle": 0}).then((result) => {
        let toggle = result.toggle;
        toggle = (toggle + 1) % toggles.length;

        chrome.storage.local.set({"toggle": toggle})

        chrome.action.setBadgeText({
            text: toggles[toggle]
        });
    });
});
