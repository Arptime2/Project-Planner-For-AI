 const currentProject = localStorage.getItem('currentProject');
 let currentPath = [];
 let data;
 let pendingItemName = null;
 let selectedIds = [];
  let selectedForMove = null;
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
        isSelectMode = !isSelectMode;
        const container = document.querySelector('.container');
        if (isSelectMode) {
            selectModeBtn.textContent = '✕';
            const groupBtn = document.getElementById('groupSelectedBtn');
            groupBtn.style.display = 'inline';
            groupBtn.textContent = '⊞';
            container.classList.add('select-mode');
            selectedForMove = null;
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
        } else {
            selectModeBtn.textContent = '☛';
            document.getElementById('groupSelectedBtn').style.display = 'none';
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

    const groupSelectedBtn = document.getElementById('groupSelectedBtn');
    groupSelectedBtn.addEventListener('click', () => {
        if (selectedIds.length > 0) {
            completeGroup();
            isSelectMode = false;
            selectModeBtn.textContent = '☛';
            groupSelectedBtn.style.display = 'none';
            document.querySelector('.container').classList.remove('select-mode');
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
            if (saveData()) {
                renderTree();
            }
        }
    } else {
        // Delete the item if edited to empty
        const parent = findParent(data.nodes, id);
        const siblings = parent ? parent.children : data.nodes;
        const index = siblings.findIndex(n => n.id === id);
        if (index !== -1) {
            siblings.splice(index, 1);
            if (saveData()) {
                renderTree();
            }
        }
    }
    textEl.contentEditable = false;
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
        if (e.target.closest('.folder-text') || e.target.closest('.folder-icon')) return;
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
        } else if (e.target.closest('.folder-text')) {
            editNode(node.id);
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
             if (isDeleteMode) {
                 if (findParent(data.nodes, node.id) === null) return; // prevent deleting root
                 deleteNode(node.id);
             } else if (selectedForMove) {
                 const fromNode = findNode(data.nodes, selectedForMove);
                 if (fromNode && isDescendant(fromNode, node.id)) {
                     selectedForMove = null;
                     document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
                     renderTree();
                 } else {
                     moveNode(selectedForMove, node.id);
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
              } else {
                 if (selectedForMove) {
                     if (selectedForMove === node.id) {
                         selectedForMove = null;
                         li.classList.remove('moving');
                         animateOutDropZones(() => renderTree());
                     }
                     // else do nothing, use drop zones
                 } else {
                     // Prevent moving root items to avoid deleting the entire project
                     if (!findParent(data.nodes, node.id)) {
                         selectedForMove = null;
                     } else {
                         selectedForMove = node.id;
                         li.classList.add('moving');
                         renderTree();
                     }
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
    if (node.type !== 'group' && !isMobile) {
        text.ondblclick = () => editNode(node.id);
    }
    li.append(icon, text);
    if (node.children !== undefined && node.type !== 'group') {
        const subUl = document.createElement('ul');
        subUl.className = 'folder-sublist';
        li.appendChild(subUl);
        if (selectedForMove && node.children.length === 0) {
            const dropLi = createDropZone(subUl);
            subUl.appendChild(dropLi);
            requestAnimationFrame(() => {
                dropLi.style.height = '10px';
                dropLi.style.padding = '1px 0';
            });
            subUl.style.display = 'block';
        } else {
            subUl.style.display = 'none';
        }
        node.children.forEach(child => renderItem(child, subUl));
    }
    ul.appendChild(li);
    if (selectedForMove && node.children !== undefined && node.type !== 'group') {
        const dropLi = createDropZone();
        ul.appendChild(dropLi);
        requestAnimationFrame(() => {
            dropLi.style.height = '10px';
            dropLi.style.padding = '1px 0';
        });
    }
}

function animateOutDropZones(callback) {
    const dropLis = document.querySelectorAll('.drop-zone');
    if (dropLis.length === 0) {
        callback();
        return;
    }
    dropLis.forEach(dropLi => {
        dropLi.style.height = '0px';
        dropLi.style.padding = '0';
        dropLi.style.margin = '0';
    });
    dropLis.forEach(dropLi => {
        dropLi.innerHTML = '';
        dropLi.style.height = '0px';
        dropLi.style.padding = '0';
        dropLi.style.margin = '0';
    });
    setTimeout(() => {
        dropLis.forEach(dropLi => {
            dropLi.style.borderWidth = '0px';
            dropLi.style.boxShadow = 'none';
            dropLi.style.opacity = '0';
            dropLi.style.display = 'none';
        });
        setTimeout(callback, 50);
    }, 250);
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

function createDropZone() {
    const dropLi = document.createElement('li');
    dropLi.className = 'drop-zone';
    dropLi.innerHTML = '&nbsp;';
    dropLi.style.height = '0px';
    dropLi.style.padding = '0';
    dropLi.style.margin = '0';
    dropLi.onclick = () => {
        let dropParent;
        let insertIndex;
        const currentParent = findParent(data.nodes, selectedForMove);
        const prevLi = dropLi.previousElementSibling;
        if (!prevLi) {
            // drop at start of subUl, insert as first child of the folder
            const ul = dropLi.parentElement;
            const parentLi = ul.parentElement;
            if (parentLi && parentLi.classList.contains('folder-item')) {
                const folderId = parentLi.dataset.id;
                dropParent = findNode(data.nodes, folderId);
                if (!dropParent) return;
                const siblings = dropParent.children;
                insertIndex = 0;
            } else {
                return;
            }
        } else if (prevLi.classList.contains('folder-item')) {
            const targetId = prevLi.dataset.id;
            const targetNode = findNode(data.nodes, targetId);
            if (!targetNode) return;
            dropParent = findParent(data.nodes, targetId);
            const siblings = dropParent ? dropParent.children : data.nodes;
            const targetIndex = siblings.findIndex(n => n.id === targetId);
            insertIndex = targetIndex + 1;
        } else {
            return;
        }
        if (currentParent !== dropParent && dropParent === null) return; // prevent moving to root
        const siblings = dropParent ? dropParent.children : data.nodes;
        const fromIndex = siblings.findIndex(n => n.id === selectedForMove);
        if (fromIndex !== -1 && fromIndex < insertIndex) {
            insertIndex--;
        }
        let fromNode = null;
        function remove(nodes) {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === selectedForMove) { fromNode = nodes.splice(i, 1)[0]; return true; }
                if (remove(nodes[i].children)) return true;
            }
            return false;
        }
        remove(data.nodes);
        if (fromNode) {
            siblings.splice(insertIndex, 0, fromNode);
            selectedForMove = null;
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('moving'));
            animateOutDropZones(() => {
                if (saveData()) {
                    renderTree();
                    // keep the dropParent's sublist expanded after move
                    if (dropParent && typeof dropParent === 'object' && dropParent.id) {
                        const li = document.querySelector(`.folder-item[data-id="${dropParent.id}"]`);
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
            });
        }
    };
    return dropLi;
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