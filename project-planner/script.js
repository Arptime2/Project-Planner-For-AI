const currentProject = localStorage.getItem('currentProject');
let draggedId = null;
let draggedType = null;
let currentPath = [];
let data;
let pendingItemName = null;
let isPressing = false;
let pressStartTime = 0;
let pressCheckInterval = null;

function handleDragStart(e) { draggedId = e.target.closest('.folder-item').dataset.id; draggedType = 'node'; }
function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.folder-item');
    if (targetItem) {
        const targetId = targetItem.dataset.id;
        if (draggedType === 'node' && draggedId !== targetId) moveNode(draggedId, targetId);
    }
    document.querySelectorAll('.folder-item').forEach(n => n.classList.remove('drag-over'));
}
function handleDragOver(e) { e.preventDefault(); const item = e.target.closest('.folder-item'); if (item) item.classList.add('drag-over'); }
function handleDragLeave(e) { const item = e.target.closest('.folder-item'); if (item) item.classList.remove('drag-over'); }

function handleTreeDrop(e) { e.preventDefault(); }
function addEventListeners() {
    document.querySelectorAll('.folder-item').forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
    });

    document.getElementById('tree').addEventListener('dragover', handleDragOver);
    document.getElementById('tree').addEventListener('drop', handleTreeDrop);
}

if (!currentProject) { alert('No project selected. Please open a project first.'); window.location.href = '../main.html'; }
else {
    data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": []}');
    renderTree();
    addEventListeners();
}

document.getElementById('submitNewItem').onclick = () => {
    const name = document.getElementById('newItemName').value.trim();
    if (name) {
        pendingItemName = name;
        document.getElementById('newItemName').value = '';
        document.querySelector('.container').classList.add('selection-mode');
    }
};

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
        const node = findNode(data.nodes, id);
        if (node && node.children && node.children.length > 0) {
            const li = document.querySelector(`.folder-item[data-id="${id}"]`);
            if (li) {
                const sublist = li.querySelector('.folder-sublist');
                if (sublist) sublist.style.display = 'block';
                const icon = li.querySelector('.folder-icon');
                if (icon) {
                    icon.classList.remove('folder-closed');
                    icon.classList.add('folder-open');
                }
            }
        }
    });
    addEventListeners();
}



function renderItem(node, ul) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.id = node.id;
    li.onclick = () => {
        if (pendingItemName) {
            addChild(node.id, pendingItemName);
            pendingItemName = null;
            document.querySelector('.container').classList.remove('selection-mode');
        }
    };
    // Long press for delete
    li.addEventListener('mousedown', (e) => { e.stopPropagation(); if (!e.target.closest('.folder-text')) startLongPress(node.id, li); });
    li.addEventListener('mouseup', (e) => { e.stopPropagation(); cancelLongPress(li); });
    li.addEventListener('mouseleave', (e) => { e.stopPropagation(); cancelLongPress(li); });
    li.addEventListener('touchstart', (e) => { e.stopPropagation(); if (!e.target.closest('.folder-text')) startLongPress(node.id, li); });
    li.addEventListener('touchend', (e) => { e.stopPropagation(); cancelLongPress(li); });
    li.addEventListener('touchmove', (e) => { e.stopPropagation(); cancelLongPress(li); });
    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    if (node.children?.length) {
        icon.classList.add('folder-closed');
    } else {
        icon.classList.add('file');
    }
    icon.onclick = () => {
        const sublist = li.querySelector('.folder-sublist');
        if (sublist) {
            sublist.style.display = sublist.style.display === 'none' ? 'block' : 'none';
            if (sublist.style.display === 'none') {
                icon.classList.remove('folder-open');
                icon.classList.add('folder-closed');
            } else {
                icon.classList.remove('folder-closed');
                icon.classList.add('folder-open');
            }
        }
    };
    const text = document.createElement('span');
    text.className = 'folder-text';
    text.contentEditable = false;
    text.textContent = node.text;
    text.ondblclick = () => editNode(node.id);
    const btns = document.createElement('div');
    btns.className = 'folder-buttons';
    // Removed delete button
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

function addChild(parentId, name = 'Idea') {
    const parent = findNode(data.nodes, parentId);
    if (parent) {
        const newNode = { id: Date.now().toString(), text: name, children: [] };
        parent.children.push(newNode);
        saveData();
        renderTree();
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
    console.log('Attempting to delete node with id:', id);
    if (id === 'root') return; // Cannot delete root
    function remove(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) {
                console.log('Removing node:', nodes[i].text);
                nodes.splice(i, 1);
                return true;
            }
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

function startLongPress(nodeId, li) {
    isPressing = true;
    pressStartTime = Date.now();
    li.classList.add('pressing');
    pressCheckInterval = setInterval(() => {
        if (isPressing && Date.now() - pressStartTime >= 1500) {
            console.log('Deleting node', nodeId);
            deleteNode(nodeId);
            cancelLongPress(li);
        }
    }, 100);
    console.log('Long press started on', nodeId);
}

function cancelLongPress(li) {
    isPressing = false;
    if (pressCheckInterval) {
        clearInterval(pressCheckInterval);
        pressCheckInterval = null;
    }
    li.classList.remove('pressing');
    console.log('Long press cancelled');
}