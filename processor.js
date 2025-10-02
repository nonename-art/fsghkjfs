self.onmessage = (event) => {
    const { jsonFile } = event.data;
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const conversations = JSON.parse(e.target.result);
            if (!Array.isArray(conversations)) {
                throw new Error("conversations.json is not a valid JSON array.");
            }

            conversations.sort((a, b) => (b.create_time || 0) - (a.create_time || 0));
            const conversationDataMap = new Map(conversations.map(conv => [conv.id, conv]));
            const allConversations = conversations.map(({ id, title, create_time }) => ({ id, title, create_time }));
            const allMemoryData = extractMemoryData(conversations);

            self.postMessage({
                type: 'initial-data',
                data: {
                    allConversations,
                    conversationDataMap: Array.from(conversationDataMap.entries()),
                    allMemoryData
                }
            });

            const searchIndex = buildSearchIndex(conversations);

            self.postMessage({
                type: 'search-index-done',
                data: { searchIndex }
            });

        } catch (error) {
            self.postMessage({ type: 'error', message: error.message });
        }
    };

    reader.onerror = () => {
        self.postMessage({ type: 'error', message: 'Failed to read the JSON file.' });
    };

    reader.readAsText(jsonFile);
};

function buildSearchIndex(conversations) {
    const searchIndex = [];
    const sanitizeForSearch = (text) => {
        if (typeof text !== 'string') return '';
        const lowercasedText = text.toLowerCase();
        const normalizedText = lowercasedText.replace(/\s+/g, ' ').trim();
        return normalizedText;
    };

    conversations.forEach(conv => {
        if (!conv.mapping) return;
        Object.values(conv.mapping).forEach(node => {
            if (node.message && node.message.content && node.message.content.parts) {
                const textContent = node.message.content.parts
                    .filter(p => typeof p === 'string' && p.trim() !== '')
                    .join(' ');

                if (textContent) {
                    const sanitizedText = sanitizeForSearch(textContent);
                    searchIndex.push({
                        conversationId: conv.id,
                        messageId: node.id,
                        conversationTitle: conv.title || `Untitled (${conv.id.substring(0, 8)})`,
                        text: sanitizedText,
                        originalText: textContent.substring(0, 150)
                    });
                }
            }
        });
    });
    return searchIndex;
}
function extractMemoryData(conversations) {
    const memoryData = [];
    conversations.forEach(conv => {
        if (!conv.mapping) return;

        Object.values(conv.mapping).forEach(node => {
            const msg = node.message;
            if (
                msg &&
                msg.author &&
                msg.author.role === 'assistant' &&
                msg.recipient === 'bio' &&
                msg.content &&
                msg.content.parts
            ) {
                const memoryContent = msg.content.parts[0];
                if (typeof memoryContent === 'string' && memoryContent.trim() !== '') {
                    memoryData.push({
                        conversationId: conv.id,
                        conversationTitle: conv.title || `Untitled (${conv.id.substring(0, 8)})`,
                        content: memoryContent,
                        create_time: msg.create_time || 0
                    });
                }
            }
        });
    });
    return memoryData;
}