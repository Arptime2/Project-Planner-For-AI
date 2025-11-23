 const currentProject = localStorage.getItem('currentProject');
 let currentPath = [];
 let data;
 let pendingItemName = null;
 let selectedIds = [];
 let selectedForMove = null;
 let isSelectMode = false;
 let pointerDownTime = 0;
 let pointerStartX = 0;
 let pointerStartY = 0;
 let pointerMoved = false;
 let lastTouchY = 0;
 let preventPullToRefresh = false;




function addEventListeners() {
    const selectModeBtn = document.getElementById('selectModeBtn');
    selectModeBtn.addEventListener('click', () => {
        isSelectMode = !isSelectMode;
        if (isSelectMode) {
            selectModeBtn.textContent = 'Exit Select Mode';
            document.getElementById('groupSelectedBtn').style.display = 'inline';
            selectedForMove = null;
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
        } else {
            selectModeBtn.textContent = 'Enter Select Mode';
            document.getElementById('groupSelectedBtn').style.display = 'none';
            selectedIds = [];
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
        }
    });

    const groupSelectedBtn = document.getElementById('groupSelectedBtn');
    groupSelectedBtn.addEventListener('click', () => {
        if (selectedIds.length > 0) {
            completeGroup();
            isSelectMode = false;
            selectModeBtn.textContent = 'Enter Select Mode';
            groupSelectedBtn.style.display = 'none';
        }
    });

    // Prevent pull-to-refresh
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        lastTouchY = e.touches[0].clientY;
        preventPullToRefresh = window.pageYOffset === 0;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        var touchY = e.touches[0].clientY;
        var touchYDelta = touchY - lastTouchY;
        lastTouchY = touchY;
        if (preventPullToRefresh && touchYDelta > 0) {
            e.preventDefault();
            preventPullToRefresh = false;
        }
    }, { passive: false });
}

if (!currentProject) { alert('No project selected. Please open a project first.'); window.location.href = '../main.html'; }
else {
    data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": []}');
    renderTree();
    addEventListeners();
    // Move fixed elements to body to avoid stacking context issues
    const h2 = document.querySelector('h2');
    const addItem = document.querySelector('.add-item-section');
    document.body.appendChild(h2);
    document.body.appendChild(addItem);
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
}



function renderItem(node, ul) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.id = node.id;
    if (node.type === 'group') {
        li.classList.add('group');
        li.onclick = () => expandGroup(node.id);
    } else {
        li.onclick = () => {
            if (pendingItemName) {
                addChild(node.id, pendingItemName);
                pendingItemName = null;
                document.querySelector('.container').classList.remove('selection-mode');
            }
        };
        // Pointer events for tap interactions
        li.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.folder-text') || e.target.closest('.folder-icon')) return;
            e.stopPropagation();
            pointerDownTime = Date.now();
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            pointerMoved = false;
        });
        li.addEventListener('pointermove', (e) => {
            if (Math.abs(e.clientX - pointerStartX) > 10 || Math.abs(e.clientY - pointerStartY) > 10) {
                pointerMoved = true;
            }
        });
        li.addEventListener('pointerup', (e) => {
            if (e.target.closest('.folder-text') || e.target.closest('.folder-icon')) return;
            e.stopPropagation();
            if (pointerMoved || Date.now() - pointerDownTime > 500) return; // Not a tap
            if (isSelectMode) {
                const index = selectedIds.indexOf(node.id);
                if (index > -1) {
                    selectedIds.splice(index, 1);
                    li.classList.remove('selected');
                } else {
                    selectedIds.push(node.id);
                    li.classList.add('selected');
                }
            } else {
                if (selectedForMove) {
                    if (selectedForMove !== node.id) {
                        moveNode(selectedForMove, node.id);
                    }
                    selectedForMove = null;
                    document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
                } else {
                    selectedForMove = node.id;
                    li.classList.add('moving');
                }
            }
        });
    }
    const icon = document.createElement('span');
    if (node.type === 'group') {
        icon.className = 'folder-icon group';
    } else {
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
    }
    const text = document.createElement('span');
    text.className = 'folder-text';
    text.contentEditable = false;
    text.textContent = node.text;
    if (node.type !== 'group') {
        text.ondblclick = () => editNode(node.id);
    }
    const btns = document.createElement('div');
    btns.className = 'folder-buttons';
    li.append(icon, text, btns);
    if (node.children?.length && node.type !== 'group') {
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

function findParent(nodes, id, parent = null) {
    for (let node of nodes) {
        if (node.id === id) return parent;
        const found = findParent(node.children, id, node);
        if (found) return found;
    }
    return null;
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
    } else if (tab === 'project') {
        // already here
    }
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

function completeGroup() {
    if (selectedIds.length === 0) return;
    // Find the common parent
    let commonParent = null;
    let minIndex = Infinity;
    for (const id of selectedIds) {
        const parent = findParent(data.nodes, id);
        const siblings = parent ? parent.children : data.nodes;
        const index = siblings.findIndex(n => n.id === id);
        if (!commonParent || parent !== commonParent) {
            // For simplicity, assume all selected are at the same level
            commonParent = parent;
}
        if (index < minIndex) minIndex = index;
    }
    const siblings = commonParent ? commonParent.children : data.nodes;
    const selectedNodes = [];
    const indices = [];
    for (const id of selectedIds) {
        const index = siblings.findIndex(n => n.id === id);
        if (index !== -1) {
            selectedNodes.push(siblings[index]);
            indices.push(index);
        }
    }
    indices.sort((a, b) => b - a); // Remove from end
    for (const index of indices) {
        siblings.splice(index, 1);
    }
    const groupId = Date.now().toString();
    const groupNode = {
        id: groupId,
        text: `Group (${selectedNodes.length} items)`,
        type: 'group',
        children: selectedNodes
    };
    siblings.splice(minIndex, 0, groupNode);
    saveData();
    renderTree();
    selectedIds = [];
}

function expandGroup(nodeId) {
    const node = findNode(data.nodes, nodeId);
    if (node && node.type === 'group') {
        const parent = findParent(data.nodes, nodeId);
        const siblings = parent ? parent.children : data.nodes;
        const index = siblings.findIndex(n => n.id === nodeId);
        siblings.splice(index, 1, ...node.children);
        saveData();
        renderTree();
    }
}



function updateFixedWidths() {
    const clientWidth = document.documentElement.clientWidth;
    const fixedWidth = clientWidth - 100;
    document.querySelector('.add-item-section').style.width = fixedWidth + 'px';
}

updateFixedWidths();
window.addEventListener('resize', updateFixedWidths);