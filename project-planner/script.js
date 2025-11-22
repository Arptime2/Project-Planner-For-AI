const currentProject = localStorage.getItem('currentProject');
let currentPath = [];
let data;
let pendingItemName = null;
let selectedIds = [];
let selectionStartId = null;
let pressStartTime = 0;
let pressCheckInterval = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let touchStartX = 0;
let touchStartY = 0;
let draggedElement = null;
let selectionStartX = 0;
let selectionStartY = 0;
let lastTouchY = 0;
let preventPullToRefresh = false;
let isSelecting = false;
let isDragging = false;
let hasMoved = false;


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

function handleMouseMove(e) {
    if (!isSelecting) return;
    const item = document.elementFromPoint(e.clientX, e.clientY).closest('.folder-item');
    if (item) updateSelection(item.dataset.id);
}

function handleTouchMove(e) {
    if (!isSelecting) return;
    e.preventDefault();
    const item = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY).closest('.folder-item');
    if (item) updateSelection(item.dataset.id);
}

function addEventListeners() {
    const isMobile = 'ontouchstart' in window;
    if (!isMobile) {
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

    // Global touch handling
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        lastTouchY = e.touches[0].clientY;
        preventPullToRefresh = window.pageYOffset === 0;
        const target = e.target.closest('.folder-item');
        if (target && !e.target.closest('.folder-text')) {
            draggedElement = target;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchState = 'potential_drag';
            pressStartTime = Date.now();
                pressCheckInterval = setInterval(() => {
                    if (Date.now() - pressStartTime >= 1000 && !isDragging) {
                        startGroupSelection(node.id, li);
                        clearInterval(pressCheckInterval);
                    }
                }, 100);
        } else {
            touchState = 'none';
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        var touchY = e.touches[0].clientY;
        var touchYDelta = touchY - lastTouchY;
        lastTouchY = touchY;

        if (touchState === 'potential_drag') {
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            const dist = Math.sqrt(deltaX**2 + deltaY**2);
            if (dist > 5) {
                touchState = 'dragging';
                draggedElement.classList.add('dragging');
                dragOffsetX = touchStartX - draggedElement.getBoundingClientRect().left;
                dragOffsetY = touchStartY - draggedElement.getBoundingClientRect().top;
                clearInterval(pressCheckInterval);
            }
        } else if (touchState === 'dragging') {
            e.preventDefault();
            const x = e.touches[0].clientX - dragOffsetX;
            const y = e.touches[0].clientY - dragOffsetY;
            draggedElement.style.position = 'absolute';
            draggedElement.style.left = x + 'px';
            draggedElement.style.top = y + 'px';
            draggedElement.style.zIndex = '1000';
        } else if (touchState === 'selecting') {
            e.preventDefault();
            const item = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY).closest('.folder-item');
            if (item) updateSelection(item.dataset.id);
            const dist = Math.sqrt((e.touches[0].clientX - selectionStartX)**2 + (e.touches[0].clientY - selectionStartY)**2);
            if (dist > 50) {
                cancelSelection();
                touchState = 'none';
            }
        } else if (preventPullToRefresh && touchYDelta > 0) {
            e.preventDefault();
            preventPullToRefresh = false;
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (touchState === 'dragging') {
            draggedElement.style.position = '';
            draggedElement.style.left = '';
            draggedElement.style.top = '';
            draggedElement.style.zIndex = '';
            draggedElement.classList.remove('dragging');
            const dropTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            const targetItem = dropTarget.closest('.folder-item');
            if (targetItem && targetItem !== draggedElement) {
                moveNode(draggedElement.dataset.id, targetItem.dataset.id);
            }
            touchState = 'none';
            draggedElement = null;
        } else if (touchState === 'selecting') {
            completeGroup();
            touchState = 'none';
        }
        if (pressCheckInterval) clearInterval(pressCheckInterval);
    }, { passive: false });


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
        // Touch for mobile
        li.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (!e.target.closest('.folder-text')) {
                hasMoved = false;
                isDragging = false;
                pressStartTime = Date.now();
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                draggedElement = li;
                pressCheckInterval = setInterval(() => {
                    if (Date.now() - pressStartTime >= 1000 && !isDragging) {
                        startGroupSelection(node.id, li);
                        clearInterval(pressCheckInterval);
                    }
                }, 100);
            }
        });
        li.addEventListener('touchmove', (e) => {
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            const dist = Math.sqrt(deltaX**2 + deltaY**2);
            if (dist > 10) {
                hasMoved = true;
                if (Math.abs(deltaY) > Math.abs(deltaX) && !isSelecting) {
                    isDragging = true;
                    draggedElement.classList.add('dragging');
                    dragOffsetX = touchStartX - draggedElement.getBoundingClientRect().left;
                    dragOffsetY = touchStartY - draggedElement.getBoundingClientRect().top;
                    if (pressCheckInterval) {
                        clearInterval(pressCheckInterval);
                    }
                }
            }
        });
        li.addEventListener('touchend', (e) => {
            e.stopPropagation();
            if (pressCheckInterval) clearInterval(pressCheckInterval);
            if (isSelecting) completeGroup();
        });
        // Mouse for PC
        li.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (!e.target.closest('.folder-text')) {
                hasMoved = false;
                pressStartTime = Date.now();
                pressCheckInterval = setInterval(() => {
                    if (Date.now() - pressStartTime >= 1000 && !isDragging) {
                        startGroupSelection(node.id, li);
                        clearInterval(pressCheckInterval);
                    }
                }, 100);
            }
        });
        li.addEventListener('mousemove', (e) => {
            if (!hasMoved) {
                hasMoved = true;
            }
        });
        li.addEventListener('mouseup', (e) => {
            e.stopPropagation();
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
    cancelSelection();
    isSelecting = true;
    selectedIds = [nodeId];
    selectionStartId = nodeId;
    selectionStartX = touchStartX;
    selectionStartY = touchStartY;
    li.classList.add('selecting');
    document.addEventListener('mousemove', handleMouseMove);
    console.log('Group selection started on', nodeId);
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
    if (!isSelecting) {
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
    document.removeEventListener('mousemove', handleMouseMove);
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