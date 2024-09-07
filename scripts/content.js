// Known issues:
// Doesn't work if you click on the reply to an image
// Doesn't work for images within searches

const target_ids = ["275277478787022848", "334509537262567424"];

// message must have "messageListItem_*" as the class
// return true if message is from any target, otherwise returns false
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
        for (let target_id of target_ids) {
            if (avatar.src.includes(target_id)) {
                return true;
            }
        }
        return false;
    }
}

// finds image and video elements at all nestings
function findImages(node, res = null) {
    res ||= [];
    if (node.nodeName === "IMG" || node.nodeName == "VIDEO") res.push(node);
    for (let child of node.children) {
        findImages(child, res);
    }
    return res;
}

// filters out messages that are children of node, not including node
async function filterMessages(node) {
    let toggle = (await chrome.storage.local.get({"toggle": 0})).toggle;
    if (toggle === 0) return;

    // Searches all sibling nodes as well which is janky, but not that much less efficient
    const messageListItems = node.querySelectorAll("li[class^=messageListItem_]");

    messageListItems.forEach((messageListItem) => {
        if (!checkAuthor(messageListItem)) return;

        const message = messageListItem.querySelector("div[class^=message_]");
        if (!message) return;

        const accessories = message.querySelector("div[id^=message-accessories-]");
        if (!accessories) return;
        
        // hide image
        switch (toggle) {
            case 1: { // blank
                accessories.remove();
            } break;
            case 2: { // hide
                let block = document.createElement("div");
                if (findImages(accessories).length > 0) {
                    block.style.width = "auto";
                    block.style.height = "20px";
                    block.style.backgroundColor = "black";
                    accessories.replaceWith(block);
                }
            } break;
            case 3: { // url
                for (let child of accessories.children) {
                    child.style.display = "none";
                }
                for (let image of findImages(accessories)) {
                    function addUrl() {
                        let url = image.src;
                        let link = document.createElement("a");
                        link.href = url;
                        link.textContent = url;
                        accessories.appendChild(link);
                    }
                    image.complete ? addUrl() : image.addEventListener("load", addUrl);
                }
            } break;
            case 4: { // blur
                for (let image of findImages(accessories)) {
                    image.style.filter = "blur(50px)";
                }
            } break;
        }
    });
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
