// ============================================================
// PDFnest Authentication Guard
// ============================================================

(function () {

  const API_URL =
    'https://pdf-generator-ochre-two.vercel.app/api/auth';

  const token = localStorage.getItem('token');

  const currentPage =
    window.location.pathname.split('/').pop().toLowerCase();

  const publicPages = [
    'login.html',
    'signup.html'
  ];


  // ==========================================================
  // CHECK AUTHENTICATION
  // ==========================================================

  function checkAuthentication() {

    const currentToken = localStorage.getItem('token');

    // No token = definitely logged out
    if (!currentToken) {

      if (!publicPages.includes(currentPage)) {
        window.location.replace('login.html');
      }

      return;
    }


    // Verify token with backend
    fetch(`${API_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    })

      .then(response => {

        if (!response.ok) {
          throw new Error('Invalid token');
        }

        return response.json();

      })

      .then(data => {

        if (data.user) {

          localStorage.setItem(
            'user',
            JSON.stringify(data.user)
          );

        }

        // Already logged in → don't allow login/signup
        if (publicPages.includes(currentPage)) {

          window.location.replace('index.html');

        }

      })

      .catch(error => {

        console.log(
          'Authentication failed:',
          error.message
        );

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (!publicPages.includes(currentPage)) {

          window.location.replace('login.html');

        }

      });

  }


  // ==========================================================
  // INITIAL CHECK
  // ==========================================================

  checkAuthentication();


  // ==========================================================
  // BACK/FORWARD BUTTON + BFCACHE PROTECTION
  // ==========================================================

  window.addEventListener('pageshow', function () {

    checkAuthentication();

  });

})();



