const memoryMapBtn = document.getElementById('memoryMapBtn');
const memoryMapModal = document.getElementById('memoryMapModal');
const memoryMapContent = document.getElementById('memoryMapContent');
const folderInput = document.getElementById('folderInput');
const searchInput = document.getElementById('searchInput');
const sidebar = document.getElementById('sidebar');
const sidebarConversations = document.getElementById('sidebarConversations');
const chatArea = document.getElementById('chatArea');
const sidebarToggle = document.getElementById('sidebarToggle');
const mainContent = document.getElementById('mainContent');
const overlay = document.getElementById('overlay');
const header = document.querySelector('header');
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
const infoModal = document.getElementById('infoModal');
const infoBtn = document.getElementById('infoBtn');
const infoModalContent = document.getElementById('infoModalContent');
const headerTitle = document.getElementById('headerTitle');
const fileInputContainer = document.getElementById('fileInputContainer');
const chatAreaForScroll = document.getElementById('chatArea');
const infoModalContentScroller = infoModal.querySelector('.modal-content');
const memoryMapModalContentScroller = memoryMapModal.querySelector('.modal-content');
const ITEMS_PER_PAGE = 50;
const DEFAULT_SEARCH_PLACEHOLDER = "搜索...";
const newThemeSwitcherBtn = document.getElementById('theme-switcher-btn');
const body = document.body;
const BOTH_SIDEBARS_BREAKPOINT = 1280;

let currentPage = 1;
let scrollTimeout;
let sidebarScrollTimeout;
let rightPanelScrollTimeout;
let scrollSaveTimeout;
let allSearchResults = [];
let allConversations = [];
let searchIndex = [];
let allMemoryData = [];
let activeConversationId = null;
let fileMap = {};
let conversationDataMap = new Map();
let scrollPositionMemory = new Map();
const activeObservers = new Map();

const GPT_AVATAR_SVG = `
<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z"></path>
</svg>
`;

function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function sanitizeForSearch(text) {
    if (typeof text !== 'string') return '';
    const lowercasedText = text.toLowerCase();
    const normalizedText = lowercasedText.replace(/\s+/g, ' ').trim();
    return normalizedText;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// “年-月-日”
function formatTimestamp(timestamp) {
    if (typeof timestamp !== 'number' || isNaN(timestamp)) return 'Invalid Time';
    const date = new Date(timestamp * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// “年-月-日 时:分”
function formatTimestampWithTime(timestamp) {
    if (typeof timestamp !== 'number' || isNaN(timestamp)) return 'Invalid Time';
    const date = new Date(timestamp * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function waitForAnimation(element) {
    return new Promise(resolve => {
        const onEnd = () => {
            element.removeEventListener('transitionend', onEnd);
            resolve();
        };
        element.addEventListener('transitionend', onEnd);
    });
}
function waitForAnimationEnd(element) {
    return new Promise(resolve => {
        element.addEventListener('animationend', resolve, { once: true });
    });
}

function renderMarkdown(markdownText) {
    if (typeof markdownText !== 'string' || !markdownText) return '';
    //配置 marked 并将 Markdown 转换为 HTML
    marked.setOptions({
        gfm: true,
        breaks: true,
        mangle: false,
        headerIds: false
    });
    const rawHtml = marked.parse(markdownText);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    return sanitizedHtml;
}


// 过滤结构消息
function isMessageVisible(node, conversation) {
    const message = node.message;
    const nodes = conversation.mapping;

    // 基本有效性检查
    if (!message || !message.author?.role || !message.content || message.metadata?.is_visually_hidden_from_conversation) {
        return false;
    }

    const isTextMessage = message.content.content_type === 'text';
    const hasNoVisibleText = !message.content.parts || message.content.parts.length === 0 || message.content.parts.every(p => typeof p === 'string' && p.trim() === '');

    // 过滤内容为空的系统消息
    if (message.author.role === 'system' && isTextMessage && hasNoVisibleText) {
        return false;
    }

    // 过滤canmore.create_textdoc文本
    if (message.author.role === 'tool' && message.author.name === 'canmore.create_textdoc') {
        return false;
    }

    // 过滤分支外的空消息
    if (isTextMessage && hasNoVisibleText) {
        if (message.author.role !== 'assistant') {
            return false;
        }

        // 检查它是否是一个分支点
        const parentNode = node.parent ? nodes[node.parent] : null;
        const isBranchPoint = parentNode && parentNode.children && parentNode.children.length > 1;

        if (!isBranchPoint) {
            return false;
        }
    }

    return true;
}

// 过滤内容消息
function shouldSkipRenderingMessage(message) {
    //过滤内容为空的思考 
    if (
        message.content.content_type === 'thoughts' &&
        (!message.content.thoughts || message.content.thoughts.length === 0)
    ) {
        return true;
    }

    // 过滤“正在处理图片” 
    if (
        message.content.content_type === 'text' &&
        message.content.parts &&
        typeof message.content.parts[0] === 'string' &&
        message.content.parts[0].trim().startsWith("正在处理图片")
    ) {
        return true;
    }

    // 过滤网络搜索工具的调用
    if (
        message.author.role === 'assistant' &&
        message.content.content_type === 'code' &&
        message.recipient && message.recipient.startsWith('web') &&
        typeof message.content.text === 'string' &&
        (message.content.text.startsWith('search(') || message.content.text.startsWith('{"search_query":'))
    ) {
        return true;
    }

    //过滤web.run
    if (
        message.author.role === 'tool' &&
        message.author.name === 'web.run'
    ) {
        return true;
    }

    // 过滤画图返回
    const parts = message.content.parts || [];
    if (parts.some(part => {
        if (typeof part !== 'string') return false;
        const text = part.trim().toLowerCase();
        return text.startsWith('gpt-4o returned') || text.startsWith('dall·e displayed');
    })) {
        return true;
    }

    // 过滤画图prompt
    const recipient = message.recipient;
    if (
        message.author.role === 'assistant' &&
        recipient &&
        (recipient === 't2uay3k.sj1i4kz' || recipient === 'dalle.text2im')
    ) {
        try {
            const content = message.content.parts[0];
            if (typeof content === 'string' && content.trim().startsWith('{') && content.trim().endsWith('}')) {
                JSON.parse(content);
                return true;
            }
        } catch (e) { }
    }
    // 过滤 DALL-E版本画图prompt
    if (
        message.author.role === 'assistant' &&
        message.content.content_type === 'code' &&
        typeof message.content.text === 'string'
    ) {
        try {
            const parsedText = JSON.parse(message.content.text);
            if (parsedText && typeof parsedText.prompt === 'string') {
                return true;
            }
        } catch (e) { }
    }


    return false;
}

function getMessagesFromMapping(conversation, targetMessageId = null) {
    const nodes = conversation.mapping;
    if (!nodes) return [];

    let pathNodes = [];

    if (targetMessageId && nodes[targetMessageId]) {
        let historyTraceId = targetMessageId;
        while (historyTraceId && nodes[historyTraceId]) {
            pathNodes.unshift(nodes[historyTraceId]);
            historyTraceId = nodes[historyTraceId].parent;
        }

        let currentNode = nodes[targetMessageId];
        while (currentNode && currentNode.children && currentNode.children.length > 0) {
            const nextNodeId = currentNode.children[0];
            const nextNode = nodes[nextNodeId];
            if (!nextNode) break;

            pathNodes.push(nextNode);
            currentNode = nextNode;
        }

    } else {
        const startNodeId = conversation.current_node;
        let traceId = startNodeId;
        while (traceId && nodes[traceId]) {
            pathNodes.unshift(nodes[traceId]);
            traceId = nodes[traceId].parent;
        }
    }


    const messages = [];
    for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        if (!node.message) {
            continue;
        }
        const message = node.message;

        if (message.content.content_type === 'thoughts') {
            let currentNode = node;
            let searchDepth = 0;
            const MAX_SEARCH_DEPTH = 5;

            while (currentNode && searchDepth < MAX_SEARCH_DEPTH) {
                if (!currentNode.children || currentNode.children.length === 0) {
                    break;
                }

                const nextNodeId = currentNode.children[0];
                const nextNode = conversation.mapping[nextNodeId];

                if (!nextNode) {
                    break;
                }

                if (nextNode.message && nextNode.message.content.content_type === 'reasoning_recap') {
                    const duration = nextNode.message.content.finished_duration_sec;
                    if (duration) message.duration = duration;

                    nextNode.processed = true;
                    break;
                }
                if (isMessageVisible(nextNode, conversation)) {
                    break;
                }
                currentNode = nextNode;
                searchDepth++;
            }
        }
        if (node.processed) {
            continue;
        }
        if (message.content.content_type === 'reasoning_recap') {
            continue;
        }

        messages.push(message);
    }
    return messages;
}

function getSubsequentPath(startNodeId, conversation) {
    const pathMessages = [];
    let currentNodeId = startNodeId;

    while (currentNodeId) {
        const node = conversation.mapping[currentNodeId];
        if (!node || !node.message) break;

        pathMessages.push(node.message);

        if (node.children && node.children.length > 0) {
            currentNodeId = node.children[0];
        } else {
            currentNodeId = null;
        }
    }
    return pathMessages;
}

function findPromptForImage(imageMessageId, conversation) {
    let currentNode = conversation.mapping[imageMessageId];
    let searchDepth = 0;
    const MAX_SEARCH_DEPTH = 5;

    while (currentNode && currentNode.parent && searchDepth < MAX_SEARCH_DEPTH) {
        const parentNode = conversation.mapping[currentNode.parent];
        if (!parentNode || !parentNode.message) {
            break;
        }

        const message = parentNode.message;
        const recipient = message.recipient;

        if (
            message.author.role === 'assistant' &&
            recipient &&
            (recipient.startsWith('t') || recipient === 'dalle.text2im')
        ) {
            let promptJsonString = null;

            if (message.content.content_type === 'code' && message.content.text) {
                promptJsonString = message.content.text;
            }
            else if (message.content.parts && typeof message.content.parts[0] === 'string') {
                promptJsonString = message.content.parts[0];
            }

            if (promptJsonString) {
                try {
                    const parsedContent = JSON.parse(promptJsonString);
                    const finalPrompt = parsedContent.prompt || null;
                    if (finalPrompt) {
                        return finalPrompt;
                    }
                } catch (error) {
                }
            }
        }

        currentNode = parentNode;
        searchDepth++;
    }

    return null;
}

function findBranchRoot(startNode, branchParentNode, conversation) {
    let currentNode = startNode;
    // 不断向上查找父节点
    while (currentNode && currentNode.parent) {
        if (currentNode.parent === branchParentNode.id) {
            return currentNode;
        }
        currentNode = conversation.mapping[currentNode.parent];

        if (!currentNode || currentNode.id === startNode.id) {
            return null;
        }
    }
    return null;
}
function isFirstVisibleNodeOfBranch(node, parentNode, conversation) {
    let currentNode = node;
    while (currentNode && currentNode.parent && currentNode.parent !== parentNode.id) {
        return false;
    }
    return true;
}
function createVariantSwitcher(node, message, conversation) {
    let parentNode = null;
    let searchNode = node;
    while (searchNode && searchNode.parent) {
        const tempParent = conversation.mapping[searchNode.parent];
        if (tempParent && tempParent.children && tempParent.children.length > 1) {
            parentNode = tempParent;
            break;
        }
        searchNode = tempParent;
    }

    if (!parentNode) {
        return null;
    }

    const branchHeadIds = parentNode.children;

    if (!branchHeadIds || branchHeadIds.length <= 1) {
        return null;
    }

    const currentBranchRootNode = findBranchRoot(node, parentNode, conversation);
    if (!currentBranchRootNode) {
        return null;
    }

    const currentIndex = branchHeadIds.indexOf(currentBranchRootNode.id);
    if (currentIndex === -1) {
        return null;
    }

    const variantIds = branchHeadIds;

    const switcher = document.createElement('div');
    switcher.className = 'variant-switcher';

    const prevDisabled = (currentIndex === 0) ? 'disabled' : '';
    const nextDisabled = (currentIndex === variantIds.length - 1) ? 'disabled' : '';

    switcher.innerHTML = `
        <button class="variant-btn prev" title="Previous version" ${prevDisabled}>&lt;</button>
        <span class="variant-counter">${currentIndex + 1} / ${variantIds.length}</span>
        <button class="variant-btn next" title="Next version" ${nextDisabled}>&gt;</button>
    `;

    return { switcherElement: switcher, variantIds, currentIndex };
}

function createAssistantAvatar(message, conversation) {
    const frame = document.createElement('div');
    frame.className = 'avatar-frame';
    frame.innerHTML = GPT_AVATAR_SVG;

    let modelSlug = message.metadata?.model_slug;

    // 如果是图片消息，尝试从父节点获取模型信息
    const isImageMessage = message.author.role === 'tool' && message.content.parts.some(p => p?.content_type === 'image_asset_pointer');
    if (isImageMessage && !modelSlug) {
        const currentNode = conversation.mapping[message.id];
        const parentNode = currentNode?.parent ? conversation.mapping[currentNode.parent] : null;
        modelSlug = parentNode?.message?.metadata?.model_slug;
    }

    if (modelSlug) {
        frame.dataset.modelSlug = modelSlug;
    }

    return frame;
}

function createThoughtElement(thoughtMessage) {
    const thoughtsContainer = document.createElement('div');
    thoughtsContainer.className = 'thought-process';

    const durationText = thoughtMessage.duration ? `(${thoughtMessage.duration.toFixed(1)}s)` : '';

    const header = document.createElement('div');
    header.className = 'thought-header';
    header.innerHTML = `
                <svg class="thought-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M12 20v2M4 12H2M22 12h-2"/><circle cx="12" cy="12" r="3"/><path d="M17 17l2 2M5 5l2 2M5 19l2-2M19 5l-2 2"/></svg>
                <span class="thought-title-text">思考过程</span>
                <span class="thought-duration">${durationText}</span>
                <svg class="thought-toggle-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            `;

    const body = document.createElement('div');
    body.className = 'thought-body';
    let bodyHtml = '';
    thoughtMessage.content.thoughts.forEach(thought => {
        bodyHtml += `
                    <div class="thought-item">
                        <div class="thought-summary">${renderMarkdown(thought.summary)}</div>
                        <div class="thought-content">${renderMarkdown(thought.content)}</div>
                    </div>
                `;
    });
    body.innerHTML = `<div class="thought-content-wrapper">${bodyHtml}</div>`;

    thoughtsContainer.appendChild(header);
    thoughtsContainer.appendChild(body);

    return thoughtsContainer;
}


function addCopyButtonsToCodeBlocks(containerElement) {
    const codeBlocks = containerElement.querySelectorAll('pre');

    codeBlocks.forEach(preElement => {
        if (preElement.parentElement.classList.contains('code-block-wrapper')) {
            return;
        }
        if (preElement.closest('.prompt-container')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        preElement.parentNode.insertBefore(wrapper, preElement);
        wrapper.appendChild(preElement);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-btn';
        copyButton.title = 'Copy code';
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            <span>Copy</span>
        `;

        wrapper.appendChild(copyButton);
    });
}

function renderContentWithCitations(parts, contentReferences) {
    if (!parts || parts.length === 0) return '';
    const textParts = parts.filter(p => typeof p === 'string');
    if (textParts.length === 0) return '';
    let combinedText = textParts.join('');

    if (!contentReferences || contentReferences.length === 0 || !combinedText.includes('\ue200cite')) {
        return renderMarkdown(combinedText);
    }

    const referenceMap = new Map();
    contentReferences.forEach(ref => {
        if (ref.matched_text) {
            referenceMap.set(ref.matched_text, ref);
        }
    });

    const citationRegex = /(\ue200cite\ue202.+?\ue201)/g;
    const placeholders = new Map();
    let placeholderIndex = 0;

    const textWithPlaceholders = combinedText.replace(citationRegex, (match) => {
        const placeholder = `%%CITATION_PLACEHOLDER_${placeholderIndex++}%%`;
        const refData = referenceMap.get(match);
        if (!refData) {
            placeholders.set(placeholder, '');
            return placeholder;
        }

        const items = (refData.items || []).concat(refData.fallback_items || []);
        if (items.length === 0) {
            placeholders.set(placeholder, '');
            return placeholder;
        }

        let pillsHtml = items.map((item, index) => {
            const domain = (item.url && item.url.startsWith('http')) ? new URL(item.url).hostname.replace('www.', '') : (item.attribution || 'N/A');
            const citationData = {
                title: item.title || 'Untitled',
                url: item.url || null,
                domain: domain,
                snippet: item.snippet || null
            };
            const escapedData = escapeHtml(JSON.stringify(citationData));

            return `
    <button class="citation-pill" data-citation="${escapedData}" title="查看来源 ${index + 1}">
        <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 0 24 24" width="14px" fill="currentColor">
            <path d="M0 0h24v24H0V0z" fill="none"/>
            <path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8v-2z"/>
        </svg>
        <span>${index + 1}</span>
    </button>
`;
        }).join('');

        const finalPillsHtml = `<span class="citation-pills-container">${pillsHtml}</span>`;
        placeholders.set(placeholder, finalPillsHtml);

        return placeholder;
    });

    let markdownHtml = renderMarkdown(textWithPlaceholders);

    placeholders.forEach((html, placeholder) => {
        markdownHtml = markdownHtml.replace(placeholder, html);
    });

    return markdownHtml;
}

// 将消息的 content 对象转换成具体的HTML内容
function renderMessageContent(message, conversation) {
    const content = document.createElement('div');
    content.className = 'message-content';

    const parts = message.content.parts || [];
    let hasContent = false;

    // A. 处理代码块
    if (message.content.content_type === 'code' && message.content.text) {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        let codeText = message.content.text;
        try {
            const parsedJson = JSON.parse(codeText);
            codeText = (parsedJson && typeof parsedJson.content === 'string') ? parsedJson.content : JSON.stringify(parsedJson, null, 2);
        } catch (e) { }
        code.textContent = codeText;
        pre.appendChild(code);
        content.appendChild(pre);
        hasContent = true;
    }
    // B. 处理 canmore.update_textdoc 工具调用
    else if (message.recipient === 'canmore.update_textdoc' && typeof parts[0] === 'string') {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        try {
            code.textContent = JSON.stringify(JSON.parse(parts[0]), null, 2);
        } catch (e) {
            code.textContent = parts[0];
        }
        pre.appendChild(code);
        content.appendChild(pre);
        hasContent = true;
    }
    // C. 处理常规文本、引用和图片
    else {
        // C.1 渲染文本和引用
        const renderedHtml = renderContentWithCitations(parts, message.metadata?.content_references);
        if (renderedHtml && renderedHtml.trim() !== '') {
            const contentWrapper = document.createElement('div');
            contentWrapper.innerHTML = renderedHtml;
            content.appendChild(contentWrapper);
            hasContent = true;
        }

        // C.2 渲染图片
        parts.forEach(part => {
            if (part && part.content_type === 'image_asset_pointer' && part.asset_pointer) {
                const assetPointer = part.asset_pointer;
                const baseName = assetPointer.substring(assetPointer.lastIndexOf('/') + 1).replace('file-service://', '').replace('sediment://', '');
                const fullFileName = Object.keys(fileMap).find(key => key.includes(baseName));

                if (fullFileName && fileMap[fullFileName]) {
                    let associatedPrompt = null;
                    if (part.metadata && (part.metadata.dalle || part.metadata.generation)) {
                        associatedPrompt = findPromptForImage(message.id, conversation);
                    }
                    const img = document.createElement('img');
                    img.className = 'chat-img';
                    img.alt = `Image (${baseName})`;
                    const fileData = fileMap[fullFileName];
                    if (fileData instanceof File) {
                        const imageURL = URL.createObjectURL(fileData);
                        img.src = imageURL;
                        fileMap[fullFileName] = imageURL;
                    } else {
                        img.src = fileData;
                    }
                    if (associatedPrompt) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-with-prompt-wrapper';
                        const promptContainer = document.createElement('div');
                        promptContainer.className = 'prompt-container';
                        promptContainer.innerHTML = `
                                 <div class="prompt-toggle" title="显示/隐藏 Prompt">
                                     <svg class="prompt-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>
                                     <span class="prompt-label">点击展开 Prompt</span>
                                 </div>
                                 <div class="prompt-content">
                                     <pre>${escapeHtml(associatedPrompt)}</pre>
                                 </div>
                                         `;
                        wrapper.appendChild(img);
                        wrapper.appendChild(promptContainer);
                        content.appendChild(wrapper);
                    } else {
                        content.appendChild(img);
                    }
                } else {
                    const placeholder = document.createElement('p');
                    placeholder.innerHTML = `<em>[图片未找到: ${escapeHtml(baseName)}]</em>`;
                    placeholder.style.color = '#d9534f';
                    content.appendChild(placeholder);
                }
                hasContent = true;
            }
        });
    }

    return { contentElement: content, hasContent };
}

function createStandaloneThoughtElement(message) {
    if (message.content.content_type === 'thoughts') {
        const messageElement = document.createElement('div');
        messageElement.id = `message-${message.id}`;

        messageElement.className = 'message assistant';

        messageElement.appendChild(createThoughtElement(message));

        return messageElement;
    }

    return null;
}

// 渲染消息内容
function createMessageElement(message, conversation) {
    const standaloneThoughtElement = createStandaloneThoughtElement(message);
    if (standaloneThoughtElement) {
        return standaloneThoughtElement;
    }

    if (shouldSkipRenderingMessage(message)) {
        return null;
    }
    const node = conversation.mapping[message.id];
    const isImageMessage = message.author.role === 'tool' &&
        message.content.parts &&
        message.content.parts.some(p => p?.content_type === 'image_asset_pointer');
    const roleClass = isImageMessage ? 'assistant' : message.author.role;

    const { contentElement, hasContent } = renderMessageContent(message, conversation);

    const variantInfo = createVariantSwitcher(node, message, conversation);
    if (!hasContent && !variantInfo) {
        return null;
    }

    // 创建消息的UI框架
    const messageElement = document.createElement('div');
    messageElement.id = `message-${message.id}`;
    messageElement.className = `message ${roleClass}`;
    if (!hasContent) {
        messageElement.classList.add('empty-message');
    }
    if (message.attachedThought) {
        messageElement.appendChild(createThoughtElement(message.attachedThought));
    }

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = formatTimestampWithTime(message.create_time || message.update_time);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // 组装消息元素
    if (roleClass === 'assistant' && hasContent) {

        bubble.appendChild(createAssistantAvatar(message, conversation));
    }
    bubble.appendChild(contentElement);
    messageElement.appendChild(timestamp);
    messageElement.appendChild(bubble);

    // 附加分支切换器
    if (variantInfo) {
        let parentNode = null;
        let searchNode = node;
        while (searchNode && searchNode.parent) {
            const tempParent = conversation.mapping[searchNode.parent];
            if (tempParent && tempParent.children && tempParent.children.length > 1) {
                parentNode = tempParent;
                break;
            }
            searchNode = tempParent;
        }
        if (parentNode && isFirstVisibleNodeOfBranch(node, parentNode, conversation)) {
            messageElement.appendChild(variantInfo.switcherElement);
            messageElement.dataset.variantIds = variantInfo.variantIds.join(',');
            messageElement.dataset.currentIndex = variantInfo.currentIndex;
        }
    }

    addCopyButtonsToCodeBlocks(contentElement);

    return messageElement;
}

function renderInChunks(items, renderFunction, onComplete) {
    let index = 0;
    const chunkSize = 30;

    function run() {
        if (index >= items.length) {
            if (onComplete) {
                onComplete();
            }
            return;
        }

        const endTime = performance.now() + 8;
        let currentChunkSize = 0;

        while (performance.now() < endTime && index < items.length && currentChunkSize < chunkSize) {
            renderFunction(items[index]);
            index++;
            currentChunkSize++;
        }
        requestAnimationFrame(run);
    }
    requestAnimationFrame(run);
}

// 统一界面渲染
function renderMessageList(messages, container, conversation, onCompleteCallback) {
    let lastBioUpdateContent = null;
    const itemsToRender = [];

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        // 调用过滤函数
        if (shouldSkipRenderingMessage(message, messages, i)) {
            continue;
        }

        // 渲染thought
        if (message.content.content_type === 'thoughts') {
            let isAttached = false;
            for (let j = i + 1; j < messages.length; j++) {
                const nextMessage = messages[j];

                if (nextMessage.content.content_type === 'reasoning_recap') {
                    continue;
                }

                const nextNode = conversation.mapping[nextMessage.id];
                if (isMessageVisible(nextNode, conversation)) {
                    const isTextMessage = nextMessage.content.content_type === 'text';
                    const hasNoVisibleText = !nextMessage.content.parts || nextMessage.content.parts.length === 0 || nextMessage.content.parts.every(p => typeof p === 'string' && p.trim() === '');
                    if (!(isTextMessage && hasNoVisibleText)) {
                        nextMessage.attachedThought = message;
                        isAttached = true;
                        break;
                    }
                }
            }
            if (isAttached) {
                continue;
            }
        }
        // 渲染bio
        if (message.author.role === 'assistant' && message.recipient === 'bio') {
            lastBioUpdateContent = message.content.parts[0];
            continue;
        }
        const pendingConfirmationText = "Model set context write is pending confirmation by user. Please respond but DO NOT STATE THE MEMORY HAS BEEN SAVED, DELETED, OR REMEMBERED.";
        const isPendingConfirmation = message.author.role === 'assistant' && message.content.parts && message.content.parts[0] === pendingConfirmationText;
        const isToolConfirmation = message.author.role === 'tool' && message.author.name === 'bio';

        if (isToolConfirmation || isPendingConfirmation) {
            if (lastBioUpdateContent) {
                itemsToRender.push({ type: 'memory', content: lastBioUpdateContent });
                lastBioUpdateContent = null;
            }
            continue;
        }

        itemsToRender.push({ type: 'message', data: message });
    }

    renderInChunks(
        itemsToRender,
        (item) => {
            if (item.type === 'message') {
                const messageElement = createMessageElement(item.data, conversation);
                if (messageElement) {
                    container.appendChild(messageElement);
                }
            } else if (item.type === 'memory') {
                const containerElement = document.createElement('div');
                containerElement.className = 'memory-update-container';
                containerElement.innerHTML = `<svg class="memory-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"></path></svg><span class="memory-text">记忆已更新</span><div class="memory-popover">${escapeHtml(item.content)}</div>`;
                container.appendChild(containerElement);
            }
        },
        onCompleteCallback
    );
}

function renderSidebar() {
    const oldList = document.getElementById('sidebarConversations');
    if (oldList) {
        oldList.remove();
    }

    const newList = document.createElement('div');
    newList.className = 'sidebar-conversations';
    newList.id = 'sidebarConversations';

    if (allConversations.length === 0) {
        newList.innerHTML = '<p class="sidebar-placeholder">(´˘`)♡</p>';
    } else {
        allConversations.forEach((conv) => {
            const title = conv.title || `Untitled (${conv.id.substring(0, 8)})`;
            const createTime = conv.create_time ? formatTimestamp(conv.create_time) : '';
            const item = document.createElement('div');
            item.className = 'sidebar-item list-item-base';
            item.innerHTML = `
                <div class="sidebar-item-title">${escapeHtml(title)}</div>
                ${createTime ? `<div class="sidebar-item-date">${createTime}</div>` : ''}
            `;
            item.dataset.conversationId = conv.id;
            if (conv.id === activeConversationId) item.classList.add('active');
            newList.appendChild(item);
        });
    }

    sidebar.appendChild(newList);
}

function displaySearchResults(results, searchRegex) {
    allSearchResults = results;
    currentPage = 1;

    const listContainer = document.getElementById('sidebarConversations');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (results.length === 0) {
        listContainer.innerHTML = '<p class="sidebar-placeholder">无结果</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const itemsToRender = allSearchResults.slice(0, ITEMS_PER_PAGE);

    itemsToRender.forEach((result) => {
        const item = createSearchResultElement(result, searchRegex);
        fragment.appendChild(item);
    });

    listContainer.appendChild(fragment);

    if (allSearchResults.length > ITEMS_PER_PAGE) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = `加载更多 (${allSearchResults.length - ITEMS_PER_PAGE} 条)`;
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.onclick = () => loadMoreResults(searchRegex);
        listContainer.appendChild(loadMoreBtn);
    }
}

function loadMoreResults(searchRegex) {
    currentPage++;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    const newItems = allSearchResults.slice(startIndex, endIndex);

    const fragment = document.createDocumentFragment();
    newItems.forEach((result) => {
        const item = createSearchResultElement(result, searchRegex);
        fragment.appendChild(item);
    });

    const listContainer = document.getElementById('sidebarConversations');
    if (!listContainer) return;

    const loadMoreBtn = listContainer.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        listContainer.insertBefore(fragment, loadMoreBtn);

        const remaining = allSearchResults.length - endIndex;
        if (remaining > 0) {
            loadMoreBtn.textContent = `加载更多 (${remaining} 条)`;
        } else {
            loadMoreBtn.remove();
        }
    }
}

function updateMemoryMapButtonVisibility() {
    if (allMemoryData && allMemoryData.length > 0) {
        memoryMapBtn.classList.add('visible');
    } else {
        memoryMapBtn.classList.remove('visible');
    }
}
function showMemoryMap() {
    const memoryByConversation = allMemoryData.reduce((acc, memory) => {
        if (!acc[memory.conversationId]) {
            acc[memory.conversationId] = {
                title: memory.conversationTitle,
                memories: []
            };
        }
        acc[memory.conversationId].memories.push(memory);
        return acc;
    }, {});

    let html = '';
    if (Object.keys(memoryByConversation).length === 0) {
        html = '<p class="sidebar-placeholder">没有找到任何记忆更新。</p>';
    } else {
        for (const convId in memoryByConversation) {
            const group = memoryByConversation[convId];
            html += `
                <div class="memory-conversation-group">
        <div class="memory-conversation-title">${escapeHtml(group.title)}</div>
        ${group.memories.map(memoryItem => `
            <div class="memory-node">
                    <div class="memory-node-content">${escapeHtml(memoryItem.content)}</div>
                    <div class="memory-node-timestamp">${formatTimestampWithTime(memoryItem.create_time)}</div>
                </div>
             `).join('')}
             </div>
            `;
        }
    }

    memoryMapContent.innerHTML = html;
    memoryMapModal.classList.add('visible');
    setTimeout(updateRightPanelBodyClass, 0);
}
function hideMemoryMap() {
    memoryMapModal.classList.remove('visible');
    setTimeout(updateRightPanelBodyClass, 0);
}

function showInfoModal() {
    infoModal.classList.add('visible');
    setTimeout(updateRightPanelBodyClass, 0);
}
function hideInfoModal() {
    infoModal.classList.remove('visible');
    setTimeout(updateRightPanelBodyClass, 0);
}

function initCitationModal() {
    if (document.getElementById('citation-modal-overlay')) return;

    const modalHtml = `
        <div id="citation-modal-overlay" class="citation-modal-overlay">
            <div id="citation-modal-card" class="citation-modal-card">
                <div id="citation-modal-content" class="citation-modal-content"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('citation-modal-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideCitationModal();
        }
    });
}
function hideCitationModal() {
    const overlay = document.getElementById('citation-modal-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
    document.querySelectorAll('.citation-pill.active').forEach(p => p.classList.remove('active'));
}

function updateScrollToBottomButtonVisibility() {
    const bottomThreshold = 400;
    const distanceToBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;

    if (distanceToBottom > bottomThreshold) {
        scrollToBottomBtn.classList.add('visible');
    } else {
        scrollToBottomBtn.classList.remove('visible');
    }
}

//显示指定id的对话内容
async function displayConversation(conversationId, targetMessageId = null) {
    if (chatArea.classList.contains('is-animating')) {
        return;
    }
    chatArea.classList.add('is-animating');

    if (chatArea.innerHTML.trim() !== '') {
        chatArea.classList.add('animating-out');
        await waitForAnimationEnd(chatArea);
    }

    chatArea.innerHTML = '';
    chatArea.classList.remove('animating-out');

    const conversation = conversationDataMap.get(conversationId);
    if (!conversation) {
        chatArea.innerHTML = '<p class="placeholder-message">Conversation not found.</p>';
        headerTitle.innerHTML = 'Chat Viewer';
        infoBtn.classList.remove('visible');
        memoryMapBtn.classList.remove('visible');
        chatArea.classList.remove('is-animating');
        return;
    }

    const title = conversation.title || `Untitled (${conversation.id.substring(0, 8)})`;
    const createTime = conversation.create_time ? formatTimestamp(conversation.create_time) : '';
    headerTitle.innerHTML = createTime ? `${escapeHtml(title)}<span class="header-timestamp">${createTime}</span>` : escapeHtml(title);
    if (activeConversationId) {
        document.querySelector(`.sidebar-item.active`)?.classList.remove('active');
    }
    const currentSidebarItem = document.querySelector(`.sidebar-item[data-conversation-id="${conversationId}"]`);
    if (currentSidebarItem) currentSidebarItem.classList.add('active');
    activeConversationId = conversationId;

    const nodes = conversation.mapping;
    const contextNode = nodes ? Object.values(nodes).find(node => node.message?.content?.content_type === 'user_editable_context') : null;

    infoBtn.classList.toggle('visible', !!contextNode);
    infoBtn.disabled = !contextNode;
    if (contextNode) {
        const instructions = contextNode.message.content.user_instructions || 'N/A';
        const cleanInstructions = instructions.replace("The user provided the additional info about how they would like you to respond:\n```", "").replace(/```$/, "");
        let userProfileText = contextNode.message.content.user_profile || '';
        const parts = userProfileText.split('```');
        if (parts.length >= 2) {
            userProfileText = parts[1].replace('Other Information:', '').trim();
        }
        const userProfileContent = userProfileText ? escapeHtml(userProfileText) : '(空)';
        const userProfileHTML = userProfileContent !== '(空)' ? `<div class="info-item"><span class="info-label">User Profile:</span><span>${userProfileContent}</span></div>` : '';
        infoModalContent.innerHTML = `${userProfileHTML}<div class="info-item"><span class="info-label">User Instructions:</span><pre>${escapeHtml(cleanInstructions.trim())}</pre></div>`;
        infoBtn.disabled = false;
    }
     memoryMapBtn.classList.add('visible');
    memoryMapBtn.disabled = !(allMemoryData && allMemoryData.length > 0);
    chatArea.style.visibility = 'hidden';

    const messages = getMessagesFromMapping(conversation, targetMessageId);

    await new Promise(resolve => {
        if (messages.length === 0) {
            chatArea.innerHTML = '<p class="placeholder-message">No displayable messages.</p>';
            resolve();
            return;
        }

        const onComplete = () => {
            setTimeout(() => {
                if (targetMessageId) {
                    const messageElement = document.getElementById(`message-${targetMessageId}`);
                    if (messageElement) {
                        const paddingBase = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--padding-base'), 10);
                        const offset = header.offsetHeight + paddingBase;
                        const targetScrollTop = messageElement.offsetTop - offset;
                        chatArea.scrollTop = targetScrollTop;
                        messageElement.classList.add('highlight');
                        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
                    }
                } else if (scrollPositionMemory.has(conversationId)) {
                    chatArea.scrollTop = scrollPositionMemory.get(conversationId);
                }

                updateScrollToBottomButtonVisibility();
                resolve();
            }, 0);
        };

        renderMessageList(messages, chatArea, conversation, onComplete);
    });
    chatArea.style.visibility = '';

    chatArea.classList.add('animating-in');
    await waitForAnimationEnd(chatArea);

    chatArea.classList.remove('animating-in');
    chatArea.classList.remove('is-animating');
}

//执行搜索并更新侧边栏
function performSearch(searchTerm) {
    if (!searchTerm) {
        console.warn("Search term is empty.");
        return;
    }
    const listContainer = document.getElementById('sidebarConversations');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    setTimeout(() => {
        const escapedTerm = escapeRegExp(searchTerm);
        const searchRegex = new RegExp(escapedTerm, 'gi');
        const results = searchIndex.filter(item => searchRegex.test(item.text));
        displaySearchResults(results, searchRegex);
    }, 0);
}

function createSearchResultElement(result, searchRegex) {
    const item = document.createElement('div');
    item.className = 'search-result-item list-item-base';
    item.dataset.conversationId = result.conversationId;
    item.dataset.messageId = result.messageId;
    searchRegex.lastIndex = 0;
    const highlightedSnippet = escapeHtml(result.originalText).replace(searchRegex, (match) => `<strong>${match}</strong>`);

    item.innerHTML = `
            <div class="search-result-snippet">${highlightedSnippet}</div>
            <div class="search-result-title">来自: ${escapeHtml(result.conversationTitle)}</div>
        `;
    return item;
}

//切换侧边栏的展开/折叠
function toggleSidebar() {
    mainContent.classList.toggle('sidebar-collapsed');
    document.body.classList.toggle('sidebar-is-open');
}

//判断窗口大小
function setInitialSidebarState() {
    if (window.innerWidth <= 768) {
        mainContent.classList.add('sidebar-collapsed');
    } else {
        mainContent.classList.remove('sidebar-collapsed');
    }
}

function updateRightPanelBodyClass() {
    document.body.classList.remove('right-panel-is-open', 'info-panel-is-open', 'memory-map-is-open');

    const isInfoVisible = infoModal.classList.contains('visible');
    const isMemoryVisible = memoryMapModal.classList.contains('visible');
    if (isInfoVisible) {
        document.body.classList.add('right-panel-is-open', 'info-panel-is-open');
    } else if (isMemoryVisible) {
        document.body.classList.add('right-panel-is-open', 'memory-map-is-open');
    }
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function collapsePromptContainer(container) {
    if (!container) return;

    container.classList.remove('expanded');

    const img = container.previousElementSibling;
    if (img && img.tagName === 'IMG') {
        const imageWidth = img.offsetWidth;
        container.style.width = `${imageWidth - 2}px`;
    }
}


function handleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (Object.keys(fileMap).length > 0) {
        Object.values(fileMap).forEach(value => {
            if (typeof value === 'string' && value.startsWith('blob:')) {
                URL.revokeObjectURL(value);
            }
        });
    }
    fileMap = {};
    allConversations = [];
    conversationDataMap.clear();
    searchIndex = [];
    let jsonFile = null;

    const inputId = event.target.id;

    if (inputId === 'folderInput') {
        for (const file of files) {
            if (file.webkitRelativePath.endsWith('conversations.json')) {
                jsonFile = file;
            }
            fileMap[file.name] = file;
        }
    } else { 
        jsonFile = files[0];
    }

    if (!jsonFile) {
        const expectedFile = inputId === 'folderInput' ? '"conversations.json"' : '一个 JSON 文件';
        alert(`错误: 未在您的选择中找到${expectedFile}。`);
        return;
    }

    const sidebar = document.getElementById('sidebarConversations');
    sidebar.innerHTML = '<p class="sidebar-placeholder">正在加载对话列表... (´∀｀*)</p>';
    searchInput.disabled = true;
    searchInput.placeholder = "正在构建索引...";
    document.body.classList.remove('initial-state');
    mainContent.classList.remove('sidebar-collapsed');

    const worker = new Worker('processor.js');

    worker.onmessage = (event) => {
        const message = event.data;
        switch (message.type) {
            case 'initial-data':
                allConversations = message.data.allConversations;
                conversationDataMap = new Map(message.data.conversationDataMap);
                allMemoryData = message.data.allMemoryData || [];
                renderSidebar();
                break;
            case 'search-index-done':
                searchIndex = message.data.searchIndex;
                searchInput.disabled = false;
                searchInput.placeholder = DEFAULT_SEARCH_PLACEHOLDER;
                worker.terminate();
                break;
            case 'error':
                alert('处理数据时发生错误: ' + message.message);
                sidebar.innerHTML = '<p class="sidebar-placeholder">加载失败 (´;ω;`)</p>';
                searchInput.disabled = false;
                searchInput.placeholder = "搜索...";
                worker.terminate();
                break;
        }
    };

    worker.onerror = (error) => {
        alert('Worker 发生致命错误: ' + error.message);
        worker.terminate();
    };
    worker.postMessage({ jsonFile });
}

function handleResize() {
    if (document.activeElement === searchInput) {
        return;
    }

    if (window.innerWidth <= 768) {
        mainContent.classList.add('sidebar-collapsed');
    } else {
        mainContent.classList.remove('sidebar-collapsed');
        document.body.classList.remove('sidebar-is-open');
    }
    updateRightPanelBodyClass();
}


function handleCitationClick(citationPill, event) {
    event.stopPropagation();
    initCitationModal();

    const overlay = document.getElementById('citation-modal-overlay');
    const card = document.getElementById('citation-modal-card');
    const contentEl = document.getElementById('citation-modal-content');

    const pillRect = citationPill.getBoundingClientRect();
    const chatAreaRect = document.getElementById('chatArea').getBoundingClientRect();

    const cardLeft = chatAreaRect.left + (chatAreaRect.width / 2);
    card.style.left = `${cardLeft}px`;

    const cardBottom = window.innerHeight - chatAreaRect.bottom + 20;
    card.style.bottom = `${cardBottom}px`;

    document.querySelectorAll('.citation-pill.active').forEach(p => p.classList.remove('active'));
    citationPill.classList.add('active');

    const data = JSON.parse(citationPill.getAttribute('data-citation'));
    contentEl.innerHTML = `
        ${data.url ? `<a href="${data.url}" target="_blank" rel="noopener noreferrer" class="citation-title">${data.title}</a>` : `<span class="citation-title">${data.title}</span>`}
        <div class="citation-domain">${data.domain}</div>
        ${data.snippet ? `<div class="citation-snippet">${data.snippet}</div>` : ''}
    `;

    overlay.classList.add('visible');
}
function handleVariantButtonClick(variantButton, event) {
    const messageElement = variantButton.closest('.message');
    if (!messageElement || !messageElement.dataset.variantIds) return;

    const variantIds = messageElement.dataset.variantIds.split(',');
    const currentIndex = parseInt(messageElement.dataset.currentIndex, 10);
    const direction = variantButton.classList.contains('next') ? 1 : -1;

    const newIndex = (currentIndex + direction + variantIds.length) % variantIds.length;
    const newVariantId = variantIds[newIndex];
    const elementsToRemove = [];
    let currentElement = messageElement;
    while (currentElement) {
        elementsToRemove.push(currentElement);
        currentElement = currentElement.nextElementSibling;
    }

    elementsToRemove.forEach(el => el.remove());
    const conversation = conversationDataMap.get(activeConversationId);
    if (!conversation) return;

    const newPathMessages = getSubsequentPath(newVariantId, conversation);
    renderMessageList(newPathMessages, chatArea, conversation, null);
}
function handleThoughtHeaderClick(thoughtHeader, event) {
    const thoughtProcess = thoughtHeader.closest('.thought-process');
    if (thoughtProcess) {
        thoughtProcess.classList.toggle('expanded');
    }
}
function handlePromptContainerClick(promptContainer, event) {
    const isExpanded = promptContainer.classList.contains('expanded');
    const isClickOnToggle = event.target.closest('.prompt-toggle');

    if (!isExpanded || (isExpanded && isClickOnToggle)) {
        promptContainer.classList.toggle('expanded');

        if (promptContainer.classList.contains('expanded')) {
            promptContainer.style.width = '';
        } else {
            collapsePromptContainer(promptContainer);
        }
    }
}
async function handleCopyCodeClick(copyBtn, event) {
    const wrapper = copyBtn.closest('.code-block-wrapper');
    const codeElement = wrapper ? wrapper.querySelector('code') : null;

    if (codeElement) {
        try {
            await navigator.clipboard.writeText(codeElement.textContent);

            const originalContent = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                    <path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                <span>Copied!</span>
            `;
            copyBtn.classList.add('copied');

            setTimeout(() => {
                copyBtn.innerHTML = originalContent;
                copyBtn.classList.remove('copied');
            }, 2000);

        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
}

const chatAreaClickHandlers = [
    { selector: '.copy-code-btn', handler: handleCopyCodeClick },
    { selector: '.citation-pill', handler: handleCitationClick },
    { selector: '.variant-btn', handler: handleVariantButtonClick },
    { selector: '.thought-header', handler: handleThoughtHeaderClick },
    { selector: '.prompt-container', handler: handlePromptContainerClick }
];

chatAreaForScroll.addEventListener('scroll', throttle(() => {
    chatAreaForScroll.classList.add('is-scrolling');

    if (activeConversationId) {
        clearTimeout(scrollSaveTimeout);
        scrollSaveTimeout = setTimeout(() => {
            scrollPositionMemory.set(activeConversationId, chatAreaForScroll.scrollTop);
        }, 150);
    }

    clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
        chatAreaForScroll.classList.remove('is-scrolling');
    }, 1000);

    updateScrollToBottomButtonVisibility();
}, 100));

if (newThemeSwitcherBtn) {
    newThemeSwitcherBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    });
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('#chatArea') && !e.target.closest('#citation-modal-overlay')) {
        hideCitationModal();
    }
});

folderInput.addEventListener('change', handleFileSelect);
jsonFileInput.addEventListener('change', handleFileSelect);

sidebarToggle.addEventListener('click', () => {
    const isOpening = mainContent.classList.contains('sidebar-collapsed');

    if (isOpening) {
        const isRightPanelOpen = document.body.classList.contains('right-panel-is-open');
        if (window.innerWidth < BOTH_SIDEBARS_BREAKPOINT && isRightPanelOpen) {
            hideInfoModal();
            hideMemoryMap();
        }
    }

    toggleSidebar();
});

window.addEventListener('DOMContentLoaded', setInitialSidebarState);

memoryMapBtn.addEventListener('click', () => {
    if (memoryMapModal.classList.contains('visible')) {
        hideMemoryMap();
    } else {
        if (window.innerWidth < BOTH_SIDEBARS_BREAKPOINT && !mainContent.classList.contains('sidebar-collapsed')) {
            toggleSidebar();
        }

        if (infoModal.classList.contains('visible')) {
            hideInfoModal();
        }
        showMemoryMap();
    }
});
memoryMapModal.addEventListener('click', (e) => {
    if (window.innerWidth < 769 && e.target === memoryMapModal) {
        hideMemoryMap();
    }
});

overlay.addEventListener('click', toggleSidebar);

window.addEventListener('resize', handleResize);

document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('chat-img')) {
        modalImg.src = e.target.src;
        imageModal.style.display = 'flex';
    }
});

imageModal.addEventListener('click', function () {
    this.style.display = 'none';
});
infoBtn.addEventListener('click', () => {
    if (infoModal.classList.contains('visible')) {
        hideInfoModal();
    } else {
        if (window.innerWidth < BOTH_SIDEBARS_BREAKPOINT && !mainContent.classList.contains('sidebar-collapsed')) {
            toggleSidebar();
        }

        if (memoryMapModal.classList.contains('visible')) {
            hideMemoryMap();
        }
        showInfoModal();
    }
});
let longPressTimer;

chatArea.addEventListener('touchstart', function (e) {
    const avatar = e.target.closest('.avatar-frame');
    if (!avatar) return;

    longPressTimer = setTimeout(() => {
        avatar.classList.add('long-press-active');
    }, 500);
});

chatArea.addEventListener('touchend', function (e) {
    clearTimeout(longPressTimer);
    const activeAvatar = chatArea.querySelector('.avatar-frame.long-press-active');
    if (activeAvatar) {
        activeAvatar.classList.remove('long-press-active');
    }
});

chatArea.addEventListener('touchmove', function (e) {
    clearTimeout(longPressTimer);
});

chatArea.addEventListener('scroll', () => {
    chatArea.classList.add('is-scrolling');
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        chatArea.classList.remove('is-scrolling');
    }, 1000);
    updateScrollToBottomButtonVisibility();
});

scrollToBottomBtn.addEventListener('click', () => {
    chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: 'smooth'
    });
});

infoModal.addEventListener('click', (e) => {
    if (window.innerWidth < 769 && e.target === infoModal) {
        hideInfoModal();
    }
});

searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        const searchTerm = sanitizeForSearch(searchInput.value);
        if (searchTerm) {
            performSearch(searchTerm);
        }
    }
});
searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') {
        renderSidebar();
    }
});
searchInput.addEventListener('focus', () => {
    if (!searchInput.disabled) {
        searchInput.placeholder = '回车后开始搜索';
    }
});

searchInput.addEventListener('blur', () => {
    if (searchInput.value.trim() === '' && !searchInput.disabled) {
        searchInput.placeholder = DEFAULT_SEARCH_PLACEHOLDER;
    }
});

document.addEventListener('click', function (e) {
    const expandedPrompt = document.querySelector('.prompt-container.expanded');
    if (expandedPrompt && !expandedPrompt.contains(e.target)) {
        collapsePromptContainer(expandedPrompt);
    }

    const expandedThought = document.querySelector('.thought-process.expanded');
    const clickedOnAThoughtHeader = e.target.closest('.thought-header');

    if (expandedThought && !expandedThought.contains(e.target) && (!clickedOnAThoughtHeader || clickedOnAThoughtHeader.closest('.thought-process') !== expandedThought)) {
        expandedThought.classList.remove('expanded');
    }

}, true);

sidebar.addEventListener('click', async (e) => {
    const targetItem = e.target.closest('.list-item-base');

    if (!targetItem) {
        return;
    }

    const conversationId = targetItem.dataset.conversationId;
    const messageId = targetItem.dataset.messageId;

    if (conversationId && messageId) {
        if (window.innerWidth <= 768 && !mainContent.classList.contains('sidebar-collapsed')) {
            mainContent.classList.add('sidebar-collapsed');
            const sidebarElement = mainContent.querySelector('.sidebar');
            if (sidebarElement) await waitForAnimation(sidebarElement);
        }
        await displayConversation(conversationId, messageId);
    }
    else if (conversationId) {
        displayConversation(conversationId);
        if (window.innerWidth <= 768) {
            mainContent.classList.add('sidebar-collapsed');
        }
    }
});

sidebar.addEventListener('scroll', throttle((e) => {
    if (e.target.id === 'sidebarConversations') {
        const listContainer = e.target;
        listContainer.classList.add('is-scrolling');

        clearTimeout(sidebarScrollTimeout);

        sidebarScrollTimeout = setTimeout(() => {
            listContainer.classList.remove('is-scrolling');
        }, 1000);
    }
}, 100), true);

const handleRightPanelScroll = (event) => {
    const panelContent = event.target;
    panelContent.classList.add('is-scrolling');

    clearTimeout(rightPanelScrollTimeout);
    rightPanelScrollTimeout = setTimeout(() => {
        panelContent.classList.remove('is-scrolling');
    }, 1000);
};
if (infoModalContentScroller) {
    infoModalContentScroller.addEventListener('scroll', throttle(handleRightPanelScroll, 100));
}
if (memoryMapModalContentScroller) {
    memoryMapModalContentScroller.addEventListener('scroll', throttle(handleRightPanelScroll, 100));
}

chatArea.addEventListener('click', function (e) {
    for (const config of chatAreaClickHandlers) {
        const targetElement = e.target.closest(config.selector);
        if (targetElement) {
            config.handler(targetElement, e);
            return;
        }
    }
});

renderSidebar();