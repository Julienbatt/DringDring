export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `px-3 py-2 rounded shadow text-white ${
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-800'
  }`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 300ms';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}



