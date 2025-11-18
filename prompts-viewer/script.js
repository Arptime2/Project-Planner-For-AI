const currentProject = localStorage.getItem('currentProject');
let currentPromptIndex = 0;
let allPrompts = [];

if (!currentProject) {
    alert('No project selected. Please open a project first.');
    window.location.href = '../main.html';
} else {
    const data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": [], "ideas": []}');
    allPrompts = generatePrompts(data.nodes);
    showCurrentPrompt();
    displayAllPrompts();
}

function generatePrompts(nodes, prompts = [], prefix = '') {
    nodes.forEach(node => {
        const fullName = prefix ? `${prefix} > ${node.text}` : node.text;
        let prompt;
        if (prefix === '') {
            prompt = `Create a root-level README.md for '${fullName}' with project overview and ideas. Add MD files for each tree node at level 0, containing general plans and brainstorming notes.`;
        } else if (node.children && node.children.length > 0) {
            prompt = `For '${fullName}', create MD plan files outlining sub-components. Generate prototype files (e.g., .js, .html) with function stubs and folder structure, but no real logic code. Plan structure and create files as structure.`;
        } else {
            prompt = `For '${fullName}', mark as read and delete the used plan MD files. Use the prototype functions and files, and fill the correct ones with the correct logic code.`;
        }
        prompt += ' Ensure the implementation follows best practices, handles edge cases, and includes comments for clarity.';
        prompts.push(prompt);
        if (node.children && node.children.length > 0) {
            generatePrompts(node.children, prompts, fullName);
        }
    });
    return prompts;
}

function showCurrentPrompt() {
    const promptDiv = document.getElementById('currentPrompt');
    if (currentPromptIndex < allPrompts.length) {
        promptDiv.innerHTML = `
            <div class="prompt-item">
                <div class="prompt-text">${currentPromptIndex + 1}. ${allPrompts[currentPromptIndex]}</div>
                <button class="copy-btn" onclick="copyPrompt()">Copy</button>
            </div>
        `;
    } else {
        promptDiv.innerHTML = '<p>All prompts completed.</p>';
    }
}

function copyPrompt() {
    navigator.clipboard.writeText(allPrompts[currentPromptIndex]).then(() => {
        alert('Prompt copied!');
    });
}

function displayAllPrompts() {
    const list = document.getElementById('promptsList');
    list.innerHTML = '';
    allPrompts.forEach((prompt, index) => {
        const item = document.createElement('div');
        item.className = 'prompt-item';
        const text = document.createElement('div');
        text.className = 'prompt-text';
        text.textContent = `${index + 1}. ${prompt}`;
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(prompt).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy', 2000);
            });
        };
        item.append(text, copyBtn);
        list.appendChild(item);
    });
}

function nextPrompt() {
    currentPromptIndex++;
    if (currentPromptIndex % 5 === 0 || currentPromptIndex >= allPrompts.length) {
        showCheckpoint();
    } else {
        showCurrentPrompt();
    }
}

function showCheckpoint() {
    const data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": []}');
    const features = flattenNodes(data.nodes);
    const list = document.getElementById('checkpointList');
    list.innerHTML = '';
    features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        list.appendChild(li);
    });
    document.getElementById('checkpointBox').style.display = 'block';
}

function flattenNodes(nodes, result = [], prefix = '') {
    nodes.forEach(node => {
        const fullName = prefix ? `${prefix} > ${node.text}` : node.text;
        result.push(fullName);
        if (node.children) {
            flattenNodes(node.children, result, fullName);
        }
    });
    return result;
}

document.getElementById('nextPromptBtn').addEventListener('click', nextPrompt);
document.getElementById('continueBtn').addEventListener('click', () => {
    document.getElementById('checkpointBox').style.display = 'none';
    showCurrentPrompt();
});

function switchTab(tab) {
    if (tab === 'project') {
        window.location.href = '../project-planner/index.html';
    }
    // prompts is current
}