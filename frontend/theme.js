(function () {

  function applyTheme(theme) {

    if (theme === 'dark') {

      document.body.classList.add('dark-theme');

    } else {

      document.body.classList.remove('dark-theme');

    }

    const themeIcon =
      document.getElementById('themeIcon');

    if (themeIcon) {

      themeIcon.textContent =
        theme === 'dark' ? '☀' : '☾';

    }

  }


  // Apply saved theme after the page has loaded

  document.addEventListener('DOMContentLoaded', function () {

    const savedTheme =
      localStorage.getItem('pdfnest-theme') || 'light';

    applyTheme(savedTheme);


    // Theme button exists only on index.html

    const themeToggle =
      document.getElementById('themeToggle');


    if (themeToggle) {

      themeToggle.addEventListener('click', function () {

        const isDark =
          document.body.classList.contains('dark-theme');

        const newTheme =
          isDark ? 'light' : 'dark';

        localStorage.setItem(
          'pdfnest-theme',
          newTheme
        );

        applyTheme(newTheme);

      });

    }

  });

})();