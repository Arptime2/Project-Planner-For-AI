const currentProject = localStorage.getItem('currentProject');
let draggedId = null;
let draggedType = null;
let currentPath = [];
let data;
let pendingItemName = null;
let isSelecting = false;
let selectedIds = [];
let selectionStartId = null;
let isLongPressing = false;
let hasMoved = false;
let pressStartTime = 0;
let pressCheckInterval = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let touchStartX = 0;
let touchStartY = 0;
let draggedElement = null;
let selectionStartX = 0;
let selectionStartY = 0;
let lastTouchY = 0;
let preventPullToRefresh = false;

function handleDragStart(e) {
    if (isSelecting) {
        e.preventDefault();
        return;
    }
    draggedId = e.target.closest('.folder-item').dataset.id;
    draggedType = 'node';
}
function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.folder-item');
    if (targetItem) {
        const targetId = targetItem.dataset.id;
        if (isSelecting) {
            completeGroup();
        } else if (draggedType === 'node' && draggedId !== targetId) {
            moveNode(draggedId, targetId);
        }
    }
    document.querySelectorAll('.folder-item').forEach(n => n.classList.remove('drag-over'));
}
function handleDragOver(e) {
    e.preventDefault();
    const item = e.target.closest('.folder-item');
    if (item) {
        item.classList.add('drag-over');
    }
}
function handleDragLeave(e) { const item = e.target.closest('.folder-item'); if (item) item.classList.remove('drag-over'); }

function handleTreeDrop(e) { e.preventDefault(); }
function addEventListeners() {
    const isMobile = 'ontouchstart' in window;
    document.querySelectorAll('.folder-item').forEach(item => {
        if (isMobile) {
            item.draggable = false;
        } else {
            item.draggable = true;
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('dragleave', handleDragLeave);
            item.addEventListener('drop', handleDrop);
        }
    });

    if (!isMobile) {
        document.getElementById('tree').addEventListener('dragover', handleDragOver);
        document.getElementById('tree').addEventListener('drop', handleTreeDrop);
    }

    // Prevent pull-to-refresh
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        lastTouchY = e.touches[0].clientY;
        preventPullToRefresh = window.pageYOffset === 0;
    }, { passive: false });

    // Global touch listeners for dragging and selection
    document.addEventListener('touchmove', (e) => {
        var touchY = e.touches[0].clientY;
        var touchYDelta = touchY - lastTouchY;
        lastTouchY = touchY;

        if (isDragging && draggedElement) {
            e.preventDefault();
            const x = e.touches[0].clientX - dragOffsetX;
            const y = e.touches[0].clientY - dragOffsetY;
            draggedElement.style.position = 'absolute';
            draggedElement.style.left = x + 'px';
            draggedElement.style.top = y + 'px';
            draggedElement.style.zIndex = '1000';
        } else if (isSelecting) {
            e.preventDefault();
            const item = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY).closest('.folder-item');
            if (item) updateSelection(item.dataset.id);
            // Check threshold
            const dist = Math.sqrt((e.touches[0].clientX - selectionStartX)**2 + (e.touches[0].clientY - selectionStartY)**2);
            if (dist > 50) {
                cancelSelection();
            }
        } else if (preventPullToRefresh && touchYDelta > 0) {
            e.preventDefault();
            preventPullToRefresh = false;
        }
    });

    document.addEventListener('touchend', (e) => {
        if (isDragging && draggedElement) {
            draggedElement.style.position = '';
            draggedElement.style.left = '';
            draggedElement.style.top = '';
            draggedElement.style.zIndex = '';
            draggedElement.classList.remove('dragging');
            // Simulate drop
            const dropTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            const targetItem = dropTarget.closest('.folder-item');
            if (targetItem && targetItem !== draggedElement && !isSelecting) {
                moveNode(draggedElement.dataset.id, targetItem.dataset.id);
            }
            isDragging = false;
            draggedElement = null;
        }
        if (isSelecting) {
            completeGroup();
        }
    });
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
        // Long press for group selection
        li.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (!e.target.closest('.folder-text')) {
                hasMoved = false;
                li.draggable = false;
                pressStartTime = Date.now();
                pressCheckInterval = setInterval(() => {
                    if (Date.now() - pressStartTime >= 1000 && !hasMoved) {
                        li.draggable = true;
                        startGroupSelection(node.id, li);
                        clearInterval(pressCheckInterval);
                    }
                }, 100);
            }
        });
        li.addEventListener('mousemove', (e) => {
            if (!hasMoved && pressCheckInterval) {
                hasMoved = true;
                clearInterval(pressCheckInterval);
                li.draggable = true;
            }
        });
        li.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            li.draggable = true;
            if (pressCheckInterval) clearInterval(pressCheckInterval);
            if (isSelecting) completeGroup();
        });
        li.addEventListener('mouseleave', (e) => {
            e.stopPropagation();
            li.draggable = true;
            if (pressCheckInterval) clearInterval(pressCheckInterval);
        });
        li.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (!e.target.closest('.folder-text')) {
                hasMoved = false;
                li.draggable = false;
                pressStartTime = Date.now();
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                draggedElement = li;
                // For selection
                pressCheckInterval = setInterval(() => {
                    if (Date.now() - pressStartTime >= 1000 && !hasMoved && !isDragging) {
                        startGroupSelection(node.id, li);
                        clearInterval(pressCheckInterval);
                    }
                }, 100);
            }
        });
        li.addEventListener('touchmove', (e) => {
            const dist = Math.sqrt((e.touches[0].clientX - touchStartX)**2 + (e.touches[0].clientY - touchStartY)**2);
            if (dist > 10) {
                hasMoved = true;
                if (!isSelecting && !isDragging) {
                    isDragging = true;
                    draggedElement.classList.add('dragging');
                    dragOffsetX = touchStartX - draggedElement.getBoundingClientRect().left;
                    dragOffsetY = touchStartY - draggedElement.getBoundingClientRect().top;
                }
                if (pressCheckInterval) {
                    clearInterval(pressCheckInterval);
                    li.draggable = true;
                }
            }
        });
        li.addEventListener('touchend', (e) => {
            e.stopPropagation();
            li.draggable = true;
            if (pressCheckInterval) clearInterval(pressCheckInterval);
            if (isSelecting) completeGroup();
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
    }
    // project is current
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

function startGroupSelection(nodeId, li) {
    if (isDragging) return;
    if (isSelecting) cancelSelection();
    isSelecting = true;
    selectedIds = [nodeId];
    selectionStartId = nodeId;
    selectionStartX = touchStartX;
    selectionStartY = touchStartY;
    li.classList.add('selecting');
    const tree = document.getElementById('tree');
    tree.addEventListener('mousemove', handleMouseMove);
    console.log('Group selection started on', nodeId);
}

function handleMouseMove(e) {
    if (!isSelecting) return;
    const item = e.target.closest('.folder-item');
    if (item) updateSelection(item.dataset.id);
}

function handleTouchMove(e) {
    if (!isSelecting) return;
    const item = e.target.closest('.folder-item');
    if (item) updateSelection(item.dataset.id);
}

function updateSelection(nodeId) {
    if (!isSelecting) return;
    const parent = findParent(data.nodes, selectionStartId);
    const siblings = parent ? parent.children : data.nodes;
    const startIndex = siblings.findIndex(n => n.id === selectionStartId);
    const currentIndex = siblings.findIndex(n => n.id === nodeId);
    if (startIndex === -1 || currentIndex === -1) return;
    const min = Math.min(startIndex, currentIndex);
    const max = Math.max(startIndex, currentIndex);
    selectedIds = siblings.slice(min, max + 1).map(n => n.id);
    document.querySelectorAll('.folder-item').forEach(item => {
        const id = item.dataset.id;
        if (selectedIds.includes(id)) {
            item.classList.add('selecting');
        } else {
            item.classList.remove('selecting');
        }
    });
}

function completeGroup() {
    if (!isSelecting || selectedIds.length < 2) {
        cancelSelection();
        return;
    }
    const parent = findParent(data.nodes, selectedIds[0]);
    const siblings = parent ? parent.children : data.nodes;
    const selectedNodes = siblings.filter(n => selectedIds.includes(n.id));
    const groupId = Date.now().toString();
    const groupNode = {
        id: groupId,
        text: `Group (${selectedNodes.length} items)`,
        type: 'group',
        children: selectedNodes
    };
    const firstIndex = siblings.findIndex(n => n.id === selectedIds[0]);
    siblings.splice(firstIndex, selectedNodes.length, groupNode);
    saveData();
    renderTree();
    cancelSelection();
}

function cancelSelection() {
    isSelecting = false;
    selectedIds = [];
    selectionStartId = null;
    const tree = document.getElementById('tree');
    tree.removeEventListener('mousemove', handleMouseMove);
    document.querySelectorAll('.folder-item').forEach(item => item.classList.remove('selecting'));
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