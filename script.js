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
        deleteBtn.onclick = () => deleteProject(project.id);
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

window.onload = loadProjects;