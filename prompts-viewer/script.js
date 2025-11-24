const currentProject = localStorage.getItem('currentProject');
let currentPromptIndex = parseInt(localStorage.getItem(`${currentProject}_promptIndex`) || '0');
let allPrompts = [];
let promptNodes = [];
let isEndCheckpoint = false;
let lastCheckpointIndex = 0;
const lastTreeHashKey = `${currentProject}_lastTreeHash`;

function regeneratePrompts() {
    try {
        const data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": [], "ideas": []}');
        const currentHash = JSON.stringify(data);
        const storedHash = localStorage.getItem(lastTreeHashKey);
        if (storedHash !== currentHash) {
            currentPromptIndex = 0;
            lastCheckpointIndex = 0;
            localStorage.setItem(`${currentProject}_promptIndex`, '0');
        }
        localStorage.setItem(lastTreeHashKey, currentHash);
        promptNodes = [];
        allPrompts = generatePrompts(data.nodes);
        if (currentPromptIndex >= allPrompts.length) {
            currentPromptIndex = 0;
            lastCheckpointIndex = 0;
            localStorage.setItem(`${currentProject}_promptIndex`, '0');
        }
        showCurrentPrompt();
        displayAllPrompts();
    } catch (e) {
        console.error('Error regenerating prompts:', e);
        alert('Error loading project data for prompts.');
    }
}

if (!currentProject) {
    alert('No project selected. Please open a project first.');
    window.location.href = '../main.html';
} else {
    try {
        regeneratePrompts();
    } catch (e) {
        console.error('Error in prompts viewer:', e);
        alert('Error loading prompts.');
    }
}

function generatePrompts(nodes, prompts = [], prefix = '') {
    nodes.forEach(node => {
        const fullName = prefix ? `${prefix} > ${node.text}` : node.text;
        let prompt;
        if (prefix === '') {
            prompt = `Create a README.md for '${fullName}' with project overview and ideas. Add MD files with general ideas about the project and how to write good and modular code.`;
            prompt += ' Ensure the implementation follows best practices, handles edge cases, and includes comments for clarity.';
        } else if (node.children && node.children.length > 0) {
            prompt = `For '${fullName}', create function prototypes and empty files/folders. Plan in md files: structure and create files as structure, but no real logic code.`;
            prompt += ' Ensure the implementation follows best practices, handles edge cases, and includes comments for clarity.';
        } else {
            prompt = `For '${fullName}', use the prototype functions and files, and fill the correct ones with the specific logic code. Ensure the implementation follows best practices.`;
        }
        prompts.push(prompt);
        promptNodes.push(fullName);
        if (node.children && node.children.length > 0) {
            generatePrompts(node.children, prompts, fullName);
        }
    });
    return prompts;
}

function showCurrentPrompt() {
    if (currentPromptIndex >= allPrompts.length) {
        currentPromptIndex = 0;
        localStorage.setItem(`${currentProject}_promptIndex`, '0');
    }
    const promptDiv = document.getElementById('currentPrompt');
    promptDiv.innerHTML = `
        <div class="prompt-item">
            <div class="prompt-text"></div>
            <button class="copy-btn" onclick="copyPrompt()">Copy</button>
        </div>
    `;
    const textDiv = promptDiv.querySelector('.prompt-text');
    textDiv.textContent = `${currentPromptIndex + 1}. ${allPrompts[currentPromptIndex]}`;
    console.log('Showing prompt:', currentPromptIndex + 1, 'text:', allPrompts[currentPromptIndex]);
}

function copyPrompt() {
    navigator.clipboard.writeText(allPrompts[currentPromptIndex]).then(() => {
        const btn = document.querySelector('#currentPrompt .copy-btn');
        if (btn) {
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
        }
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
    console.log('All Prompts:', allPrompts);
}

function extractFullName(prompt) {
    const match = prompt.match(/for '([^']+)'/i);
    return match ? match[1] : '';
}

function nextPrompt() {
    if (document.getElementById('checkpointBox').style.display === 'block') {
        if (isEndCheckpoint) {
            currentPromptIndex = 0;
            lastCheckpointIndex = 0;
            localStorage.setItem(`${currentProject}_promptIndex`, '0');
        }
        document.getElementById('checkpointBox').style.display = 'none';
        document.getElementById('generatedSection').style.display = 'block';
        isEndCheckpoint = false;
        showCurrentPrompt();
        return;
    }
    let shouldCheckpoint = false;
    if (currentPromptIndex + 1 < allPrompts.length) {
        const currentFullName = extractFullName(allPrompts[currentPromptIndex]);
        const nextFullName = extractFullName(allPrompts[currentPromptIndex + 1]);
        const currentDepth = (currentFullName.match(/ > /g) || []).length;
        const nextDepth = (nextFullName.match(/ > /g) || []).length;
        if (nextDepth < currentDepth) shouldCheckpoint = true;
        currentPromptIndex++;
    } else {
        isEndCheckpoint = true;
        shouldCheckpoint = true;
    }
    localStorage.setItem(`${currentProject}_promptIndex`, currentPromptIndex.toString());
    if (shouldCheckpoint) {
        showCheckpoint();
        lastCheckpointIndex = isEndCheckpoint ? allPrompts.length : currentPromptIndex;
    } else {
        showCurrentPrompt();
    }
}

function showCheckpoint() {
    let features;
    if (isEndCheckpoint) {
        features = promptNodes.slice(lastCheckpointIndex, allPrompts.length);
    } else {
        features = promptNodes.slice(lastCheckpointIndex, currentPromptIndex);
    }
    const list = document.getElementById('checkpointList');
    list.innerHTML = '';
    features.forEach((feature, index) => {
        const li = document.createElement('li');
        const targetIndex = lastCheckpointIndex + index;
        li.textContent = `Prompt ${targetIndex + 1}: ${feature}`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
            console.log('Clicked feature for prompt:', targetIndex + 1);
            currentPromptIndex = targetIndex;
            lastCheckpointIndex = targetIndex;
            localStorage.setItem(`${currentProject}_promptIndex`, currentPromptIndex.toString());
            document.getElementById('checkpointBox').style.display = 'none';
            document.getElementById('generatedSection').style.display = 'block';
            showCurrentPrompt();
        });
        list.appendChild(li);
    });
    document.getElementById('checkpointBox').style.display = 'block';
    document.getElementById('generatedSection').style.display = 'none';
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
    if (isEndCheckpoint) {
        currentPromptIndex = 0;
        lastCheckpointIndex = 0;
        localStorage.setItem(`${currentProject}_promptIndex`, '0');
    }
    document.getElementById('checkpointBox').style.display = 'none';
    document.getElementById('generatedSection').style.display = 'block';
    isEndCheckpoint = false;
    showCurrentPrompt();
});

function switchTab(tab) {
    if (tab === 'project') {
        window.location.href = '../project-planner/index.html';
    } else if (tab === 'prompts') {
        // already here
    }
}