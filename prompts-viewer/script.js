const currentProject = localStorage.getItem('currentProject');

if (!currentProject) {
    alert('No project selected. Please open a project first.');
    window.location.href = '../main.html';
} else {
    const data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": [], "ideas": []}');
    displayPrompts(data);
}

function generatePrompts(nodes, prompts = [], prefix = '') {
    nodes.forEach(node => {
        const fullName = prefix ? `${prefix} > ${node.text}` : node.text;
        prompts.push(`Plan the implementation and structure for "${fullName}". Include key features, sub-components, and potential challenges.`);
        prompts.push(`Create a detailed outline for "${fullName}". Describe the purpose, dependencies, and integration points.`);
        if (node.children && node.children.length > 0) {
            generatePrompts(node.children, prompts, fullName);
        }
    });
    return prompts;
}

function displayPrompts(data) {
    const prompts = generatePrompts(data.nodes);
    const list = document.getElementById('promptsList');
    list.innerHTML = '';
    prompts.forEach((prompt, index) => {
        const item = document.createElement('div');
        item.className = 'prompt-item';
        const text = document.createElement('div');
        text.className = 'prompt-text';
        text.textContent = prompt;
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

function switchTab(tab) {
    if (tab === 'project') {
        window.location.href = '../project-planner/index.html';
    }
    // prompts is current
}