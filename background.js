chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get({"toggle": false}).then((result) => {
        let toggle = result.toggle;

        chrome.action.setBadgeText({
            text: toggle ? "On" : "Off"
        });
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.storage.local.get({"toggle": false}).then((result) => {
        let toggle = result.toggle;

        chrome.storage.local.set({"toggle": !toggle})

        chrome.action.setBadgeText({
            text: !toggle ? "On" : "Off"
        });
    });
});
