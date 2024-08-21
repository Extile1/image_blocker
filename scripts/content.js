// Known issues:
// Doesn't work if you click on the reply to an image
// Doesn't work for images within searches

const target_id = "275277478787022848";

// message must have "messageListItem_*" as the class
// return true if message is from the target, otherwise returns false
function checkAuthor(messageListItem) {
    if (!messageListItem) return false;

    const message = messageListItem.querySelector("div[class^=message_]");
    if (!message) return false;

    const contents = message.querySelector("div[class^=contents_]");
    if (!contents) return false;

    const avatar = contents.querySelector("img[class^=avatar_]");
    if (!avatar) {
        const prev = messageListItem.previousElementSibling;
        return checkAuthor(prev);
    } else {
        return avatar.src.includes(target_id);
    }
}

// filters out messages that are children of node, not including node
async function filterMessages(node) {
    let result = await chrome.storage.local.get({"toggle": false});
    if (!result.toggle) return;

    // Searches all sibling nodes as well which is janky, but not that much less efficient
    const messageListItems = node.querySelectorAll("li[class^=messageListItem_]");

    messageListItems.forEach((messageListItem) => {
        if (!checkAuthor(messageListItem)) return;

        const message = messageListItem.querySelector("div[class^=message_]");
        if (!message) return;

        const accessories = message.querySelector("div[id^=message-accessories-]");
        if (!accessories) return;
        accessories.remove();
    })
}

let observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (!mutation.addedNodes) {
            return;
        }

        for (var i = 0; i < mutation.addedNodes.length; i++) {
            let node = mutation.addedNodes[i];
            node = node.parentElement ? node.parentElement : node;

            filterMessages(node);
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});
