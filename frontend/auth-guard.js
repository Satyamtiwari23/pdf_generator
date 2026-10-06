// ============================================================
// PDFnest Authentication Guard (supports subfolders)
// ============================================================

(function () {

  const API_URL = 'https://pdf-generator-ochre-two.vercel.app/api/auth';

  // Detect if we're inside a section subfolder
  const isSubfolder = /\/(image_section|converter_section|pdf_section)\//.test(
    window.location.pathname
  );
  const rootPrefix = isSubfolder ? '../' : '';

  const currentPage = window.location.pathname.split('/').pop().toLowerCase();

  const publicPages = ['login.html', 'signup.html'];

  function goTo(page) {
    window.location.replace(rootPrefix + page);
  }

  function checkAuthentication() {

    const currentToken = localStorage.getItem('token');

    if (!currentToken) {
      if (!publicPages.includes(currentPage)) goTo('login.html');
      return;
    }

    fetch(`${API_URL}/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    })
      .then(response => {
        if (!response.ok) throw new Error('Invalid token');
        return response.json();
      })
      .then(data => {
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        if (publicPages.includes(currentPage)) goTo('index.html');
      })
      .catch(error => {
        console.log('Authentication failed:', error.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!publicPages.includes(currentPage)) goTo('login.html');
      });
  }

  checkAuthentication();
  window.addEventListener('pageshow', checkAuthentication);

})();