// Ketunkolo site interactions
(function() {
  const root = document.documentElement;
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('primaryNavList');
  const themeToggle = document.getElementById('themeToggle');
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const yearEl = document.getElementById('year');

  yearEl.textContent = new Date().getFullYear();

  // Navigation toggle (mobile)
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Theme toggle (persist preference)
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    document.body.setAttribute('data-theme', storedTheme);
    themeToggle.textContent = storedTheme === 'light' ? '🌙' : '☀️';
  }
  themeToggle?.addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? 'dark' : 'light';
    if (newTheme === 'dark') document.body.removeAttribute('data-theme'); else document.body.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', newTheme === 'dark' ? 'dark' : 'light');
    themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
  });

  // Simple contact form handler (client-side only placeholder)
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      formStatus.textContent = '';
      const data = new FormData(contactForm);
      const name = data.get('name')?.toString().trim();
      const email = data.get('email')?.toString().trim();
      const message = data.get('message')?.toString().trim();
      if (!name || !email || !message) {
        formStatus.textContent = 'Please fill out all fields.';
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
