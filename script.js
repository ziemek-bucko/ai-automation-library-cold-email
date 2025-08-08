let prompts = [];
let customGpts = [];

async function loadData() {
    const promptFiles = ['prompts/prompt-1.json', 'prompts/prompt-2.json', 'prompts/prompt-3.json'];
    const gptFiles = ['gpts/gpt-1.json', 'gpts/gpt-2.json', 'gpts/gpt-3.json'];

    try {
        const promptPromises = promptFiles.map(file => fetch(file).then(res => res.json()));
        const gptPromises = gptFiles.map(file => fetch(file).then(res => res.json()));

        prompts = await Promise.all(promptPromises);
        customGpts = await Promise.all(gptPromises);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderItems('Prompts', prompts);
    renderItems('CustomGPTs', customGpts);

    const modal = document.getElementById('item-detail-view');
    const closeButton = document.querySelector('.close-button');

    closeButton.onclick = () => {
        modal.style.display = 'none';
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    const categoryLinks = document.querySelectorAll('.categories a');
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const category = link.textContent;
            filterItems(category);
        });
    });
});

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName('tab-content');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }
    tablinks = document.getElementsByClassName('tab-link');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(' active', '');
    }
    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.className += ' active';
    
    // After switching tab, reset category to 'All categories'
    document.querySelector('.categories a.active').classList.remove('active');
    document.querySelector('.categories a').classList.add('active');
    filterItems('All categories');
}

function renderItems(tabName, items) {
    const grid = document.querySelector(`#${tabName} .templates-grid`);
    grid.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `<h3>${item.title}</h3><p>${item.category}</p>`;
        div.onclick = () => showItemDetail(item, tabName);
        grid.appendChild(div);
    });
}

function filterItems(category) {
    const activeTab = document.querySelector('.tab-link.active').textContent;
    let itemsToFilter;
    let tabName;

    if (activeTab === 'Prompts') {
        itemsToFilter = prompts;
        tabName = 'Prompts';
    } else {
        itemsToFilter = customGpts;
        tabName = 'CustomGPTs';
    }

    let filteredItems;
    if (category === 'All categories') {
        filteredItems = itemsToFilter;
    } else {
        filteredItems = itemsToFilter.filter(item => item.category === category);
    }

    renderItems(tabName, filteredItems);
}

function showItemDetail(item, type) {
    const modal = document.getElementById('item-detail-view');
    const detailContainer = modal.querySelector('.detail-container');
    
    let content = '';
    if (type === 'Prompts') {
        const placeholders = item.prompt.match(/\[\[(.*?)\]\]/g) || [];
        const uniquePlaceholders = [...new Set(placeholders)];

        let formHtml = '<div class="prompt-form">';
        uniquePlaceholders.forEach(ph => {
            const key = ph.replace(/\[\[|\]\]/g, '');
            formHtml += `<label>${key}:</label><input type="text" class="prompt-variable-input" data-placeholder="${ph}" placeholder="Enter ${key}">`;
        });
        formHtml += '</div>';

        content = `
            <div class="description">
                <h2>${item.title}</h2>
                <p>${item.description}</p>
                ${formHtml}
                 <div class="prompt-buttons">
                    <button class="run-prompt-button">Run Prompt</button>
                    <button class="clear-button">Clear</button>
                </div>
            </div>
            <div class="prompt-area">
                <textarea class="prompt-input" readonly>${item.prompt}</textarea>
                <textarea class="output-area" readonly>${item.output}</textarea>
            </div>
        `;
    } else { // CustomGPTs
        let chatHtml = '<div class="chat-conversation">';
        const messages = item.chat_conversation.split(/\n\n(?=User:|GPT:)/);
        
        messages.forEach(msg => {
            let messageClass = '';
            let avatarChar = '';
            let messageText = '';

            if (msg.startsWith('User:')) {
                messageClass = 'user-message';
                avatarChar = 'U';
                messageText = msg.substring(6).trim();
            } else if (msg.startsWith('GPT:')) {
                messageClass = 'gpt-message';
                avatarChar = 'G';
                messageText = msg.substring(5).trim();
            }

            if(messageText) {
                const escapedText = messageText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                chatHtml += `
                    <div class="chat-message ${messageClass}">
                        <div class="avatar">${avatarChar}</div>
                        <div class="message-content">${escapedText.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }
        });

        chatHtml += '</div>';

        content = `
            <div class="description">
                <h2>${item.title}</h2>
                <p>${item.description}</p>
                <a href="${item.cta_link}" class="cta-button" target="_blank">Use this GPT</a>
            </div>
            <div class="chat-area">
                ${chatHtml}
            </div>
        `;
    }

    detailContainer.innerHTML = content;

    if (type === 'Prompts') {
        const runButton = detailContainer.querySelector('.run-prompt-button');
        const clearButton = detailContainer.querySelector('.clear-button');
        const promptInput = detailContainer.querySelector('.prompt-input');
        const variableInputs = detailContainer.querySelectorAll('.prompt-variable-input');

        runButton.onclick = () => {
            let updatedPrompt = item.prompt;
            variableInputs.forEach(input => {
                const placeholder = input.getAttribute('data-placeholder');
                const value = input.value;
                if (value) {
                    updatedPrompt = updatedPrompt.replace(new RegExp(placeholder.replace(/\W/g, '\\$&'), 'g'), value);
                }
            });
            promptInput.value = updatedPrompt;
        };

        clearButton.onclick = () => {
            promptInput.value = item.prompt;
            variableInputs.forEach(input => {
                input.value = '';
            });
        };
    }

    modal.style.display = 'block';
}
