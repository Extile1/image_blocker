// Known issues:
// Doesn't work if you click on the reply to an image
// Doesn't work for images within searches

const target_ids = ["275277478787022848", "334509537262567424"];

let toggle = null;
async function getToggle() {
    let first = toggle == null;
    toggle = (await chrome.storage.local.get({"toggle": 0})).toggle;

    // filter loaded parts of DOM once toggle updated
    if (first) filterMutations([{addedNodes: [document.documentElement]}]);
}
getToggle();

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

function classHas(element, prefix) {
    if (!(element instanceof Element)) return false;

    for (const className of element.classList) {
        if (className.startsWith(prefix)) {
            return true;
        }
    }

    return false;
}

// find index of messageListItem in ancestors
// treats searchResult as messageListItem (second boolean is true when this is the case)
function getMliIndex(ancestors) {
    let mliIndex = ancestors.length - 1;
    function validMessageListItem(element) {
        return (element.nodeName === "LI" && element.id.startsWith("chat-messages-") && classHas(element, "messageListItem_"))
            || (element.nodeName === "DIV" && classHas(element, "searchResult_"));
    }
    while (mliIndex >= 0 && !validMessageListItem(ancestors[mliIndex])) {
        --mliIndex;
    }
    return [mliIndex, mliIndex >= 0 && ancestors[mliIndex].nodeName === "DIV"];
}

function filterMedia(media, ancestors) {
    let [mliIndex, inSearch] = getMliIndex(ancestors);
    if (mliIndex < 0 || !checkAuthor(ancestors[mliIndex])) return;

    let accessories = ancestors[mliIndex + 2 + inSearch];
    if (!accessories || !accessories.id.startsWith("message-accessories-"))
        return;

    let mediaWrapper = ancestors[mliIndex + 3 + inSearch];
    if (!mediaWrapper || !(classHas(mediaWrapper, "embedWrapper_") || classHas(mediaWrapper, "visualMediaItemContainer_")))
        return;

    // filter media
    switch (toggle) {
        case 1: { // blank
            mediaWrapper.remove();
        } break;
        case 2: { // hide
            let block = document.createElement("div");
            block.style.width = "500px";
            block.style.height = "20px";
            block.style.backgroundColor = "black";
            mediaWrapper.replaceWith(block);
        } break;
        case 3: { // url
            for (let child of accessories.children) {
                child.style.display = "none";
            }
            function addUrl() {
                let url = media.src;
                let link = document.createElement("a");
                link.href = url;
                if (url.startsWith("https://media.discordapp.net/attachments/")) {
                    let i = url.lastIndexOf("/") + 1;
                    let j = url.lastIndexOf("?");
                    url = url.substr(i, j-i);
                }
                link.textContent = url;
                accessories.appendChild(link);
            }
            media.complete ? addUrl() : media.addEventListener("load", addUrl);
        } break;
        case 4: { // blur
            media.style.filter = "blur(50px)";
        } break;
    }
}

function filterMutations(mutations) {
    if (toggle === 0) return;

    mutations.forEach(function (mutation) {
        if (!mutation.addedNodes) {
            return;
        }

        for (let node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE)
                continue;

            // find ancestors
            let ancestors = [];
            let curr = node.parentElement;
            while (curr) {
                ancestors.push(curr);
                curr = curr.parentElement;
            }
            ancestors.reverse();

            // filter leaves
            function filterLeafElements(element) {
                if (element.children.length === 0) {
                    filterLeaf(element, ancestors);
                    return;
                }
                
                ancestors.push(element);
                for (let child of element.children) {
                    filterLeafElements(child);
                }
                ancestors.pop();
            }

            filterLeafElements(node);
        }
    });
}

// filter leaves
function filterLeaf(node, ancestors) {
    // determine if is media
    if (["IMG", "VIDEO"].includes(node.nodeName)) {
        filterMedia(node, ancestors);
    }
}

let observer = new MutationObserver(function (mutations) {
    getToggle(); // update toggle (not perfect since async but good enough)
    filterMutations(mutations);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});
