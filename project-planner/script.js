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
 const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);




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

function renderItem(node, ul) {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.id = node.id;
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
        if (e.target.closest('.folder-text') || e.target.closest('.folder-icon')) return;
        e.stopPropagation();
        if (pointerMoved || Date.now() - pointerDownTime > 500) return; // Not a tap
        if (pendingItemName) {
            addChild(node.id, pendingItemName);
            pendingItemName = null;
            document.querySelector('.container').classList.remove('selection-mode');
        } else if (node.type === 'group') {
            expandGroup(node.id);
        } else {
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
                    // Prevent moving root items to avoid deleting the entire project
                    if (!findParent(data.nodes, node.id)) {
                        selectedForMove = null;
                    } else {
                        selectedForMove = node.id;
                        li.classList.add('moving');
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
    if (node.children?.length && node.type !== 'group') {
        const subUl = document.createElement('ul');
        subUl.className = 'folder-sublist';
        subUl.style.display = 'none';
        li.appendChild(subUl);
        node.children.forEach(child => renderItem(child, subUl));
    }
    ul.appendChild(li);
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
    if (tab === 'prompts') {
        window.location.href = '../prompts-viewer/index.html';
    } else if (tab === 'project') {
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