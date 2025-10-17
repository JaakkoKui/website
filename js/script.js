// Ketunkolo site interactions
(function() {
  const root = document.documentElement;
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('primaryNavList');
  const themeToggle = document.getElementById('themeToggle');
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Navigation toggle (mobile)
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Theme toggle (persist preference)
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme && themeToggle) {
    if (storedTheme === 'light') {
      document.body.setAttribute('data-theme', 'light');
      themeToggle.textContent = '🌙';
    } else {
      document.body.removeAttribute('data-theme');
      themeToggle.textContent = '☀️';
    }
  }
  themeToggle?.addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? 'dark' : 'light';
    if (newTheme === 'dark') document.body.removeAttribute('data-theme'); else document.body.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', newTheme === 'dark' ? 'dark' : 'light');
    if (themeToggle) themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
  });

  // Simple contact form handler (client-side only placeholder)
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      formStatus.textContent = '';
      const data = new FormData(contactForm);
      const name = data.get('name')?.toString().trim();
      const phone = data.get('phone')?.toString().trim();
      const message = data.get('message')?.toString().trim();
      if (!name || !phone || !message) {
        formStatus.textContent = 'Please fill out all fields (name, number, message).';
        formStatus.style.color = '#ffae66';
        return;
      }
      // Placeholder success feedback
      formStatus.textContent = 'Message queued locally (backend not yet connected).';
      formStatus.style.color = '#7dd87d';
      contactForm.reset();
    });
  }

})();
