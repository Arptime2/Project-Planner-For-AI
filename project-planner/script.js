 const currentProject = localStorage.getItem('currentProject');
 let currentPath = [];
 let data;
 let pendingItemName = null;
 let selectedIds = [];
  let selectedForMove = null;
  let isMoveMode = false;
  let selectedForMoveItem = null;
  let isSelectMode = false;
  let isDeleteMode = false;
 let pointerDownTime = 0;
 let pointerStartX = 0;
 let pointerStartY = 0;
 let pointerMoved = false;
 let lastTouchY = 0;
 let preventPullToRefresh = false;
 const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);




function addEventListeners() {
    const selectModeBtn = document.getElementById('selectModeBtn');
    selectModeBtn.addEventListener('click', () => {
        const container = document.querySelector('.container');
        if (!isSelectMode) {
            isSelectMode = true;
            updateSelectButton();
            container.classList.add('select-mode');
            selectedForMove = null;
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
        } else {
            if (selectedIds.length > 0) {
                completeGroup();
            }
            isSelectMode = false;
            updateSelectButton();
            container.classList.remove('select-mode');
            selectedIds = [];
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
        }
    });

    const deleteModeBtn = document.getElementById('deleteModeBtn');
    deleteModeBtn.addEventListener('click', () => {
        isDeleteMode = !isDeleteMode;
        const container = document.querySelector('.container');
        container.classList.toggle('delete-mode', isDeleteMode);
        deleteModeBtn.classList.toggle('active', isDeleteMode);
    });



    const moveModeBtn = document.getElementById('moveModeBtn');
    moveModeBtn.addEventListener('click', () => {
        isMoveMode = !isMoveMode;
        const container = document.querySelector('.container');
        if (isMoveMode) {
            moveModeBtn.textContent = '✕';
            container.classList.add('move-mode');
            selectedForMoveItem = null;
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
        } else {
            moveModeBtn.textContent = '⊕';
            container.classList.remove('move-mode');
            selectedForMoveItem = null;
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected-for-move'));
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
    try {
        data = JSON.parse(localStorage.getItem(currentProject) || '{"nodes": []}');
    } catch (e) {
        console.error('Failed to load project data:', e);
        data = { nodes: [] };
        alert('Failed to load project data. Starting with empty project.');
    }
     renderTree();
     addEventListeners();
     // Move fixed elements to body to avoid stacking context issues
     const addItem = document.querySelector('.add-item-section');
     document.body.appendChild(addItem);
}

function showDeleteModal(id) {
    const node = findNode(data.nodes, id);
    document.getElementById('deleteItemName').textContent = node.text;
    document.getElementById('deleteModal').style.display = 'flex';
    const modal = document.getElementById('deleteModal');
    const closeModal = () => hideDeleteModal();
    document.getElementById('confirmDelete').onclick = () => {
        deleteNode(id);
        closeModal();
    };
    document.getElementById('cancelDelete').onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

function hideDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

function updateSelectButton() {
    const selectModeBtn = document.getElementById('selectModeBtn');
    if (isSelectMode) {
        selectModeBtn.textContent = selectedIds.length > 0 ? '⊞' : 'Cancel';
    } else {
        selectModeBtn.textContent = '☛';
    }
}

document.getElementById('newItemName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const name = e.target.value.trim();
        if (name) {
            pendingItemName = name;
            e.target.value = '';
            document.querySelector('.container').classList.add('selection-mode');
        }
    }
});



function saveData() {
    try {
        const jsonData = JSON.stringify(data);
        const limit = isMobile ? 2 * 1024 * 1024 : 4 * 1024 * 1024; // 2MB on mobile, 4MB desktop
        if (jsonData.length > limit) {
            alert('Project data is too large. Please reduce the number of items.');
            return false;
        }
        localStorage.setItem(currentProject, jsonData);
        return true;
    } catch (e) {
        console.error('Failed to save data:', e);
        alert('Failed to save project data. Please check storage space.');
        return false;
    }
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
        if (saveData()) {
            renderTree();
        }
    }
}





function isDescendant(parent, childId) {
    const stack = [parent];
    while (stack.length > 0) {
        const current = stack.pop();
        if (current.id === childId) {
            return true;
        }
        stack.push(...(current.children || []));
    }
    return false;
}

function moveNode(fromId, toId) {
    const fromNode = findNode(data.nodes, fromId);
    const toNode = findNode(data.nodes, toId);
    let fromNodeCopy = null;
    function remove(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === fromId) { fromNodeCopy = nodes.splice(i, 1)[0]; return true; }
            if (remove(nodes[i].children)) return true;
        }
        return false;
    }
    remove(data.nodes);
    if (fromNodeCopy) {
        function add(nodes) {
            for (let node of nodes) {
                if (node.id === toId) { node.children.push(fromNodeCopy); return true; }
                if (add(node.children)) return true;
            }
            return false;
        }
        add(data.nodes);
        if (saveData()) {
            renderTree();
        }
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
    if (saveData()) {
        renderTree();
    }
    selectedIds = [];
    updateSelectButton();
}

function expandGroup(nodeId) {
    const node = findNode(data.nodes, nodeId);
    if (node && node.type === 'group') {
        if (node.children && node.children.length > 0) {
            const parent = findParent(data.nodes, nodeId);
            const siblings = parent ? parent.children : data.nodes;
            const index = siblings.findIndex(n => n.id === nodeId);
            siblings.splice(index, 1, ...node.children);
            if (saveData()) {
                renderTree();
            }
        } else {
            alert('Group is empty and cannot be expanded.');
        }
    }
}

function renderItem(node, ul) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.id = node.id;
    if (selectedForMove === node.id) {
        li.classList.add('moving');
    }
    if (node.type === 'group') {
        li.classList.add('group');
    }
    // Pointer events for tap interactions
    li.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.folder-icon')) return;
        e.stopPropagation();
        pointerDownTime = Date.now();
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
        pointerMoved = false;
    });
    li.addEventListener('pointermove', (e) => {
        const threshold = isMobile ? 20 : 10;
        if (Math.abs(e.clientX - pointerStartX) > threshold || Math.abs(e.clientY - pointerStartY) > threshold) {
            pointerMoved = true;
        }
    });
    li.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        if (Date.now() - pointerDownTime > 500) return; // Not a tap
        if (pendingItemName) {
            addChild(node.id, pendingItemName);
            pendingItemName = null;
            document.querySelector('.container').classList.remove('selection-mode');
        } else if (node.type === 'group') {
            expandGroup(node.id);
        } else if (e.target.closest('.folder-icon')) {
            const sublist = li.querySelector('.folder-sublist');
            if (sublist) {
                sublist.style.display = sublist.style.display === 'none' ? 'block' : 'none';
                if (sublist.style.display === 'none') {
                    li.querySelector('.folder-icon').classList.remove('folder-open');
                    li.querySelector('.folder-icon').classList.add('folder-closed');
                } else {
                    li.querySelector('.folder-icon').classList.remove('folder-closed');
                    li.querySelector('.folder-icon').classList.add('folder-open');
                }
            }
        } else {
            if (isMoveMode) {
                if (selectedForMoveItem) {
                    if (selectedForMoveItem === node.id) {
                        selectedForMoveItem = null;
                        li.classList.remove('selected-for-move');
                    } else {
                        const currentParent = findParent(data.nodes, selectedForMoveItem);
                        const targetParent = findParent(data.nodes, node.id);
                        if (currentParent === targetParent) {
                            const siblings = currentParent ? currentParent.children : data.nodes;
                            const fromIndex = siblings.findIndex(n => n.id === selectedForMoveItem);
                            const toIndex = siblings.findIndex(n => n.id === node.id);
                            if (fromIndex !== -1 && toIndex !== -1) {
                                const [item] = siblings.splice(fromIndex, 1);
                                siblings.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, item);
                                if (saveData()) renderTree();
                            }
                        }
                        selectedForMoveItem = null;
                        document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected-for-move'));
                    }
                } else {
                    selectedForMoveItem = node.id;
                    li.classList.add('selected-for-move');
                }
                return;
            }
            if (isDeleteMode) {
                if (findParent(data.nodes, node.id) === null) return;
                showDeleteModal(node.id);
            } else if (selectedForMove) {
                if (selectedForMove === node.id) {
                    selectedForMove = null;
                    li.classList.remove('moving');
                    renderTree();
                } else {
                    const fromNode = findNode(data.nodes, selectedForMove);
                    if (fromNode && isDescendant(fromNode, node.id)) {
                        selectedForMove = null;
                        document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
                        renderTree();
                    } else if (node.children && node.children.length === 0 && node.type !== 'group') {
                        // Prevent dropping into files
                        selectedForMove = null;
                        document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
                        renderTree();
                    } else {
                        moveNode(selectedForMove, node.id);
                    }
                }
            } else if (isSelectMode) {
                const index = selectedIds.indexOf(node.id);
                if (index > -1) {
                    selectedIds.splice(index, 1);
                    li.classList.remove('selected');
                } else {
                    selectedIds.push(node.id);
                    li.classList.add('selected');
                }
                updateSelectButton();
            } else {
                if (!findParent(data.nodes, node.id)) {
                    selectedForMove = null;
                } else {
                    selectedForMove = node.id;
                    li.classList.add('moving');
                    renderTree();
                }
            }
        }
    });
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
    li.append(icon, text);

    if (node.children !== undefined && node.type !== 'group' && !icon.classList.contains('file')) {
        const subUl = document.createElement('ul');
        subUl.className = 'folder-sublist';
        li.appendChild(subUl);
        subUl.style.display = 'none';
        node.children.forEach(child => renderItem(child, subUl));
    }
    ul.appendChild(li);
}



function deleteNode(id) {
    function remove(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (remove(nodes[i].children)) return true;
        }
        return false;
    }
    remove(data.nodes);
    if (saveData()) {
        renderTree();
    }
}



function renderTree() {
    try {
        const tree = document.getElementById('tree');
        if (!tree) return;
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
        for (const id of expanded) {
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
        }

    } catch (e) {
        console.error('Error rendering tree:', e);
        alert('Error rendering project tree. Please refresh the page.');
    }
}


function switchTab(tab) {
    if (tab === 'project') {
        // already here
    }
}

function updateFixedWidths() {
    const clientWidth = document.documentElement.clientWidth;
    const fixedWidth = clientWidth - 100;
    document.querySelector('.add-item-section').style.width = fixedWidth + 'px';
}

updateFixedWidths();
window.addEventListener('resize', updateFixedWidths);