const currentProject = localStorage.getItem('currentProject');
let draggedId = null;
let draggedType = null;
let currentPath = [];
let data;

function handleDragStart(e) { draggedId = e.target.closest('.folder-item').dataset.id; draggedType = 'node'; }
function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.folder-item');
    if (targetItem) {
        const targetId = targetItem.dataset.id;
        if (draggedType === 'node' && draggedId !== targetId) moveNode(draggedId, targetId);
        else if (draggedType === 'idea') addIdeaToNode(draggedId, targetId);
    }
    document.querySelectorAll('.folder-item').forEach(n => n.classList.remove('drag-over'));
}
function handleDragOver(e) { e.preventDefault(); const item = e.target.closest('.folder-item'); if (item) item.classList.add('drag-over'); }
function handleDragLeave(e) { const item = e.target.closest('.folder-item'); if (item) item.classList.remove('drag-over'); }
function handleIdeaDragStart(e) { draggedId = Array.from(e.target.closest('ul').children).indexOf(e.target.closest('li')); draggedType = 'idea'; }
function handleTreeDrop(e) { e.preventDefault(); if (draggedType === 'idea') addIdeaAsRoot(draggedId); }
function addEventListeners() {
    document.querySelectorAll('.folder-item').forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
    });
    document.querySelectorAll('#ideasList li').forEach(li => { li.draggable = true; li.addEventListener('dragstart', handleIdeaDragStart); });
    document.getElementById('tree').addEventListener('dragover', handleDragOver);
    document.getElementById('tree').addEventListener('drop', handleTreeDrop);
}

if (!currentProject) { alert('No project selected. Please open a project first.'); window.location.href = '../main.html'; }
else {
    data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": [], "ideas": []}');
    renderTree();
    addEventListeners();
    renderIdeas(data.ideas);
}

function saveData() { localStorage.setItem(currentProject, JSON.stringify(data)); }

function renderTree() {
    const tree = document.getElementById('tree');
    // collect expanded
    const expanded = new Set();
    document.querySelectorAll('.folder-sublist[style*="display: block"]').forEach(sublist => {
        const li = sublist.closest('.folder-item');
        if (li) expanded.add(li.dataset.id);
    });
    tree.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'folder-list';
    tree.appendChild(ul);
    data.nodes.forEach(item => renderItem(item, ul));
    // restore expanded
    expanded.forEach(id => {
        const li = document.querySelector(`.folder-item[data-id="${id}"]`);
        if (li) {
            const sublist = li.querySelector('.folder-sublist');
            if (sublist) sublist.style.display = 'block';
            const icon = li.querySelector('.folder-icon');
            if (icon) icon.textContent = '📂';
        }
    });
    addEventListeners();
}



function renderItem(node, ul) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.id = node.id;
    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.textContent = node.children?.length ? '📁' : '📄';
    icon.onclick = () => {
        const sublist = li.querySelector('.folder-sublist');
        if (sublist) {
            sublist.style.display = sublist.style.display === 'none' ? 'block' : 'none';
            icon.textContent = sublist.style.display === 'none' ? '📁' : '📂';
        }
    };
    const text = document.createElement('span');
    text.className = 'folder-text';
    text.textContent = node.text;
    text.ondblclick = () => editNode(node.id);
    const btns = document.createElement('div');
    btns.className = 'folder-buttons';
    if (node.id !== 'root') {
        const del = document.createElement('button');
        del.textContent = '×';
        del.className = 'delete-btn';
        del.onclick = () => deleteNode(node.id);
        btns.appendChild(del);
    }
    const addSub = document.createElement('button');
    addSub.textContent = 'Add Sub';
    addSub.onclick = () => addChild(node.id);
    btns.appendChild(addSub);
    li.append(icon, text, btns);
    if (node.children?.length) {
        const subUl = document.createElement('ul');
        subUl.className = 'folder-sublist';
        subUl.style.display = 'none';
        li.appendChild(subUl);
        node.children.forEach(child => renderItem(child, subUl));
    }
    ul.appendChild(li);
}

function findNode(nodes, id) {
    for (let node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
    }
}

function addChild(parentId) {
    const parent = findNode(data.nodes, parentId);
    if (parent) {
        const newNode = { id: Date.now().toString(), text: 'Idea', children: [] };
        parent.children.push(newNode);
        saveData();
        renderTree();
        // Make it editable immediately
        setTimeout(() => {
            const li = document.querySelector(`.folder-item[data-id="${newNode.id}"]`);
            if (li) {
                const textEl = li.querySelector('.folder-text');
                if (textEl) {
                    textEl.contentEditable = true;
                    textEl.focus();
                    textEl.onblur = () => saveEdit(newNode.id, textEl);
                    textEl.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            textEl.blur();
                        }
                    };
                }
            }
        }, 0);
    }
}



function editNode(id) {
    const node = findNode(data.nodes, id);
    if (node) {
        const li = document.querySelector(`.folder-item[data-id="${id}"]`);
        if (li) {
            li.classList.add('editing');
            const textEl = li.querySelector('.folder-text');
            if (textEl) {
                textEl.contentEditable = true;
                textEl.focus();
                // Select all text
                const range = document.createRange();
                range.selectNodeContents(textEl);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                textEl.onblur = () => saveEdit(id, textEl);
                textEl.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        textEl.blur();
                    }
                };
            }
        }
    }
}

function saveEdit(id, textEl) {
    const li = textEl.closest('.folder-item');
    if (li) li.classList.remove('editing');
    const newText = textEl.textContent.trim();
    if (newText) {
        const node = findNode(data.nodes, id);
        if (node) {
            node.text = newText;
            saveData();
            renderTree();
        }
    } else {
        // If empty, revert or delete?
        renderTree();
    }
    textEl.contentEditable = false;
}

function switchTab(tab) {
    if (tab === 'prompts') {
        window.location.href = '../prompts-viewer/index.html';
    }
    // project is current
}

function deleteNode(id) {
    if (id === 'root') return; // Cannot delete root
    function remove(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (remove(nodes[i].children)) return true;
        }
        return false;
    }
    remove(data.nodes);
    saveData();
    renderTree();
}

function moveNode(fromId, toId) {
    let fromNode = null;
    function remove(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === fromId) { fromNode = nodes.splice(i, 1)[0]; return true; }
            if (remove(nodes[i].children)) return true;
        }
        return false;
    }
    remove(data.nodes);
    if (fromNode) {
        function add(nodes) {
            for (let node of nodes) {
                if (node.id === toId) { node.children.push(fromNode); return true; }
                if (add(node.children)) return true;
            }
            return false;
        }
        add(data.nodes);
        saveData();
        renderTree();
    }
}

function addIdeaToNode(ideaIndex, nodeId) {
    const ideaText = data.ideas[ideaIndex];
    if (ideaText) {
        const newNode = { id: Date.now().toString(), text: ideaText, children: [] };
        function add(nodes) {
            for (let node of nodes) {
                if (node.id === nodeId) { node.children.push(newNode); return true; }
                if (add(node.children)) return true;
            }
            return false;
        }
        add(data.nodes);
        data.ideas.splice(ideaIndex, 1);
        saveData();
        renderTree();
        renderIdeas(data.ideas);
    }
}

function addIdeaAsRoot(ideaIndex) {
    const ideaText = data.ideas[ideaIndex];
    if (ideaText) {
        data.nodes.push({ id: Date.now().toString(), text: ideaText, children: [] });
        data.ideas.splice(ideaIndex, 1);
        saveData();
        renderTree();
        renderIdeas(data.ideas);
    }
}

function renderIdeas(ideas) {
    const list = document.getElementById('ideasList');
    list.innerHTML = '';
    ideas.forEach((idea, i) => {
        const li = document.createElement('li');
        li.textContent = idea;
        const del = document.createElement('button');
        del.textContent = '×';
        del.className = 'delete-btn';
        del.onclick = () => { data.ideas.splice(i, 1); saveData(); renderIdeas(data.ideas); };
        li.appendChild(del);
        list.appendChild(li);
    });
}

function addIdea() {
    const input = document.getElementById('ideaInput');
    const text = input.value.trim();
    if (text) {
        data.ideas.push(text);
        saveData();
        renderIdeas(data.ideas);
        input.value = '';
    }
}

document.getElementById('addIdeaBtn').onclick = addIdea;