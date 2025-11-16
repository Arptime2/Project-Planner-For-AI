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
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteProject(project.id);
        buttonDiv.appendChild(openBtn);
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
    projects.push({ id, name, data: {} });
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('currentProject', id);
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

window.onload = loadProjects;