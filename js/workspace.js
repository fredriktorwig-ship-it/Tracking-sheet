export function getActiveWorkspace() {
  return localStorage.getItem('activeWorkspace');
}

export function setActiveWorkspace(id) {
  localStorage.setItem('activeWorkspace', id);
}
