function loadProjects() {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const list = document.getElementById('projectList');
    list.innerHTML = '';
    projects.forEach(project => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = project.name;
        li.appendChild(nameSpan);
        const buttonDiv = document.createElement('div');
        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open';
        openBtn.onclick = () => openProject(project.id);
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export';
        exportBtn.onclick = () => exportProject(project.id, project.name);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => showDeleteModal(project.id);
        buttonDiv.appendChild(openBtn);
        buttonDiv.appendChild(exportBtn);
        buttonDiv.appendChild(deleteBtn);
        li.appendChild(buttonDiv);
        list.appendChild(li);
    });
}

function createNewProject() {
    const name = document.getElementById('newProjectName').value.trim();
    if (!name) {
        alert('Please enter a project name.');
        return;
    }
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const id = Date.now().toString();
    projects.push({ id, name, data: { nodes: [{ id: 'root', text: name, children: [] }] } });
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('currentProject', id);
    localStorage.setItem(id, JSON.stringify({ nodes: [{ id: 'root', text: name, children: [] }] }));
    document.getElementById('newProjectName').value = '';
    loadProjects();
    window.location.href = 'project-planner/index.html';
}

function openProject(id) {
    localStorage.setItem('currentProject', id);
    window.location.href = 'project-planner/index.html';
}

function deleteProject(id) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const updated = projects.filter(p => p.id !== id);
    localStorage.setItem('projects', JSON.stringify(updated));
    if (localStorage.getItem('currentProject') === id) {
        localStorage.removeItem('currentProject');
    }
    loadProjects();
}

function exportProject(id, name) {
    const data = localStorage.getItem(id);
    if (!data) {
        alert('Project data not found.');
        return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importProject() {
    document.getElementById('importFile').click();
}

document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.json')) {
        alert('Please select a valid JSON file.');
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!data.nodes || !Array.isArray(data.nodes)) {
                throw new Error('Invalid project format.');
            }
            let name = prompt('Enter project name:', file.name.replace('.json', ''));
            if (!name) return;
            const projects = JSON.parse(localStorage.getItem('projects') || '[]');
            if (projects.some(p => p.name === name)) {
                if (!confirm('A project with this name already exists. Overwrite?')) return;
                const existing = projects.find(p => p.name === name);
                localStorage.removeItem(existing.id);
                projects.splice(projects.indexOf(existing), 1);
            }
            const id = Date.now().toString();
            projects.push({ id, name, data });
            localStorage.setItem('projects', JSON.stringify(projects));
            localStorage.setItem(id, JSON.stringify(data));
            loadProjects();
        } catch (err) {
            alert('Invalid JSON file: ' + err.message);
        }
    };
    reader.readAsText(file);
});

function showDeleteModal(id) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.id === id);
    if (!project) return;
    document.getElementById('deleteItemName').textContent = project.name;
    document.getElementById('deleteModal').style.display = 'flex';
    const modal = document.getElementById('deleteModal');
    const closeModal = () => hideDeleteModal();
    document.getElementById('confirmDelete').onclick = () => {
        deleteProject(id);
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

function saveToServer() {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    if (projects.length === 0) {
        alert('No projects to save.');
        return;
    }
    projects.forEach(project => {
        const data = JSON.parse(localStorage.getItem(project.id));
        saveData('project-planner', project.name, { id: project.id, text: project.name, data })
            .then(() => console.log('Saved:', project.name))
            .catch(err => alert('Error saving ' + project.name + ': ' + err.message));
    });
    alert('Save to server initiated.');
}

function syncFromServer() {
    getData('project-planner')
        .then(result => {
            const files = result.files;
            if (files.length === 0) {
                alert('No projects found on server.');
                return;
            }
            const projects = files.map(f => ({ id: f.id, name: f.text }));
            localStorage.setItem('projects', JSON.stringify(projects));
            files.forEach(f => localStorage.setItem(f.id, JSON.stringify(f.data)));
            loadProjects();
            alert('Synced from server successfully.');
        })
        .catch(err => alert('Error syncing: ' + err.message));
}

window.onload = () => {
    loadProjects();
    document.getElementById('saveBtn').onclick = saveToServer;
    document.getElementById('syncBtn').onclick = syncFromServer;
};