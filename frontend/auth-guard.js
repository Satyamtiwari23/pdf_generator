// ============================================================
// PDFnest Authentication Guard
// ============================================================

(function () {

  const token = localStorage.getItem('token');

  const currentPage =
    window.location.pathname.split('/').pop().toLowerCase();

  // Pages that anyone is allowed to access
  const publicPages = [
    'login.html',
    'signup.html'
  ];

  // ------------------------------------------------------------
  // If there is no token
  // ------------------------------------------------------------

  if (!token) {

    if (!publicPages.includes(currentPage)) {

      window.location.href = 'login.html';

    }

    return;
  }


  // ------------------------------------------------------------
  // Verify token with backend
  // ------------------------------------------------------------

  fetch('https://pdf-generator-ochre-two.vercel.app/api/auth', {

    method: 'GET',

    headers: {
      'Authorization': `Bearer ${token}`
    }

  })

    .then(response => {

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      return response.json();

    })

    .then(data => {

      // --------------------------------------------------------
      // Token is valid
      // --------------------------------------------------------

      if (data.user) {

        // Keep user information synchronized
        localStorage.setItem(
          'user',
          JSON.stringify(data.user)
        );

      }

      // If already logged in and visiting login/signup,
      // send user to homepage
      if (publicPages.includes(currentPage)) {

        window.location.href = 'index.html';

      }

    })

    .catch(error => {

      console.log('Authentication failed:', error.message);

      // Remove invalid authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Send user to login
      if (!publicPages.includes(currentPage)) {

        window.location.href = 'login.html';

      }

    });

})();