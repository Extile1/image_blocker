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

function classHas(element, prefix) {
    if (!(element instanceof Element)) return false;

    for (const className of element.classList) {
        if (className.startsWith(prefix)) {
            return true;
        }
    }

    return false;
}

// filter leaves
async function filterLeaf(node, ancestors, toggle) {
    // determine if is media
    if (!["IMG", "VIDEO"].includes(node.nodeName)) return;

    console.log(ancestors);
    
    // find messageListItem
    let mliIndex = ancestors.length - 1; // index of messageListItem in ancestors
    function validMessageListItem(element) {
        return element.nodeName === "LI" && element.id.startsWith("chat-messages-") && classHas(element, "messageListItem_");
    }
    while (mliIndex >= 0 && !validMessageListItem(ancestors[mliIndex])) {
        --mliIndex;
    }
    if (mliIndex < 0) return;

    if (!checkAuthor(ancestors[mliIndex])) return;

    let accessories = ancestors[mliIndex + 2];
    if (!accessories || !accessories.id.startsWith("message-accessories-"))
        return;

    let mediaWrapper = ancestors[mliIndex + 3];
    if (!mediaWrapper || !(classHas(mediaWrapper, "embedWrapper_") || classHas(mediaWrapper, "visualMediaItemContainer_")))
        return;

    // filter media
    switch (toggle) {
        case 1: { // blank
            mediaWrapper.remove();
        } break;
        case 2: { // hide
            let block = document.createElement("div");
            if (findImages(accessories).length > 0) {
                block.style.width = "500px";
                block.style.height = "20px";
                block.style.backgroundColor = "black";
                mediaWrapper.replaceWith(block);
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
                    mediaWrapper.appendChild(link);
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
}

async function filterMutations(mutations) {
    let toggle = (await chrome.storage.local.get({"toggle": 0})).toggle;
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
                    filterLeaf(element, ancestors, toggle);
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

let observer = new MutationObserver(function (mutations) {
    filterMutations(mutations);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});

// filter loaded parts of DOM
filterMutations([{addedNodes: [document.documentElement]}]);
