/* ============================================================
   PDFnest — shared app shell for every tool page
   ------------------------------------------------------------
   Gives each tool the same sidebar behaviour as the homepage:
   • account menu (opens beside the account row, Logout, profile
     photo settings, name / email / avatar from the saved login)
   • Help & Support → opens the Help page on the homepage
   • mobile menu button
   • PDFnestUI.showResult(): "do the operation → preview → download
     (or Download all + Send all)" panel used by the tools
   Load with:  <script src="../js/app-shell.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  const ROOT = /\/(image_section|pdf_section|converter_section)\//.test(window.location.pathname) ? '../' : '';

  /* ---------- the account dropdown + profile settings modal (same markup as the homepage) ---------- */
  function ensureAccountMarkup() {
    const wrap = document.querySelector('.sidebar-account-wrap');
    if (wrap && !document.getElementById('profileDropdown')) {
      const menu = document.createElement('div');
      menu.id = 'profileDropdown';
      menu.className = 'profile-dropdown sidebar-profile-dropdown';
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-label', 'Account menu');
      menu.innerHTML =
        '<div class="profile-photo-section"><div class="profile-photo-wrapper"><div class="profile-photo-circle">' +
        '<span id="dropdownProfileInitial">S</span>' +
        '<img id="dropdownProfileAvatar" class="dropdown-profile-avatar" alt="Profile picture" />' +
        '</div></div></div>' +
        '<div class="profile-info"><div id="profileName" class="profile-name">User</div>' +
        '<div id="profileEmail" class="profile-email">user@example.com</div></div>' +
        '<button id="profileManageBtn" class="profile-manage" type="button">Profile photo settings</button>' +
        '<div class="profile-divider"></div>' +
        '<button id="logoutBtn" class="profile-logout" type="button">Logout</button>';
      wrap.appendChild(menu);
    }
    if (!document.getElementById('profileSettingsModal')) {
      const modal = document.createElement('div');
      modal.id = 'profileSettingsModal';
      modal.className = 'profile-settings-modal';
      modal.innerHTML =
        '<div class="profile-settings-card">' +
        '<div class="profile-settings-header"><div><h2>Profile Settings</h2><p>Manage your profile picture</p></div>' +
        '<button id="closeSettingsBtn" class="settings-close" type="button" aria-label="Close settings">×</button></div>' +
        '<div class="profile-settings-body">' +
        '<div class="settings-avatar-preview"><div id="settingsAvatarCircle"><span id="settingsInitial">S</span>' +
        '<img id="settingsAvatarImage" alt="Profile preview" /></div></div>' +
        '<div class="settings-picture-actions">' +
        '<label for="profilePictureInput" class="choose-picture-btn">📷 Choose Profile Picture</label>' +
        '<input type="file" id="profilePictureInput" accept="image/*" hidden />' +
        '<button id="removeProfilePictureBtn" class="remove-picture-btn" type="button">Remove Picture</button></div>' +
        '<p id="profilePictureStatus" class="profile-picture-status"></p></div></div>';
      document.body.appendChild(modal);
    }
  }

  function boot() {
    ensureAccountMarkup();
    initProfile();
    initAccountMenu();
    initMobileMenu();
  }

  /* ============================================================
     PROFILE (copied 1:1 from the homepage so both behave the same)
     ============================================================ */
  function initProfile() {
        /* ==========================================================
           API CONFIGURATION
           ========================================================== */

        /*
           IMPORTANT:
           Put your ACTUAL PDFnest production backend URL here.
    
           Do NOT use your CyberShield backend URL.
    
           Example:
    
           const API_BASE =
             'https://pdf-generator-ochre-two.vercel.app';
    
           For local development:
    
           const API_BASE =
             'http://localhost:5050';
        */

        const API_BASE =
          'https://pdf-generator-ochre-two.vercel.app';


        /* ==========================================================
           PROFILE ELEMENTS
           ========================================================== */

        const profileBtn =
          document.getElementById('sidebarProfileBtn');

        const sidebarUserName =
          document.getElementById('sidebarUserName');

        const sidebarUserEmail =
          document.getElementById('sidebarUserEmail');

        const profileDropdown =
          document.getElementById('profileDropdown');

        const profileInitial =
          document.getElementById('sidebarUserInitial');

        const profileAvatar =
          document.getElementById('profileAvatar');

        const profileName =
          document.getElementById('profileName');

        const dropdownProfileInitial =
          document.getElementById('dropdownProfileInitial');

        const dropdownProfileAvatar =
          document.getElementById('dropdownProfileAvatar');

        const profileEditBtn =
          document.getElementById('profileEditBtn');

        const profilePhotoMenu =
          document.getElementById('profilePhotoMenu');

        const changeProfilePictureBtn =
          document.getElementById('changeProfilePictureBtn');

        const deleteProfilePictureBtn =
          document.getElementById('deleteProfilePictureBtn');

        const profileEmail =
          document.getElementById('profileEmail');

        const settingsBtn =
          document.getElementById('profileManageBtn');

        const settingsModal =
          document.getElementById('profileSettingsModal');

        const closeSettingsBtn =
          document.getElementById('closeSettingsBtn');

        const profilePictureInput =
          document.getElementById('profilePictureInput');

        const removeProfilePictureBtn =
          document.getElementById('removeProfilePictureBtn');

        const settingsInitial =
          document.getElementById('settingsInitial');

        const settingsAvatarImage =
          document.getElementById('settingsAvatarImage');

        const profilePictureStatus =
          document.getElementById('profilePictureStatus');


        /* ==========================================================
           USER
           ========================================================== */

        let user = null;

        try {

          user = JSON.parse(
            localStorage.getItem('user') || 'null'
          );

        } catch (error) {

          console.error(
            'Unable to read user:',
            error
          );

        }



        /* ==========================================================
           RENDER PROFILE
           ========================================================== */

        function renderProfile() {

          if (!user) return;


          const name =
            user.name || 'User';

          const email =
            user.email || '';

          const initial =
            name
              .trim()
              .charAt(0)
              .toUpperCase() || 'U';


          /* --------------------------------------------------------
             Name + email
             -------------------------------------------------------- */

          if (profileName) {
            profileName.textContent = name;
          }

          if (profileEmail) {
            profileEmail.textContent = email;
          }

          if (sidebarUserName) {
            sidebarUserName.textContent = name;
          }

          if (sidebarUserEmail) {
            sidebarUserEmail.textContent = email || 'Signed in';
          }


          /* --------------------------------------------------------
             Initial
             -------------------------------------------------------- */

          if (profileInitial) {
            profileInitial.textContent = initial;
          }

          if (dropdownProfileInitial) {
            dropdownProfileInitial.textContent = initial;
          }

          if (settingsInitial) {
            settingsInitial.textContent = initial;
          }


          /* --------------------------------------------------------
             PROFILE PICTURE EXISTS
             -------------------------------------------------------- */

          if (
            user.profilePicture &&
            typeof user.profilePicture === 'string'
          ) {

            /* Header avatar */

            if (profileAvatar) {

              profileAvatar.src =
                user.profilePicture;

              profileAvatar.style.display =
                'block';

            }

            if (profileInitial) {

              profileInitial.style.display =
                'none';

            }


            /* Settings preview */

            if (settingsAvatarImage) {

              settingsAvatarImage.src =
                user.profilePicture;

              settingsAvatarImage.style.display =
                'block';

            }

            if (settingsInitial) {

              settingsInitial.style.display =
                'none';

            }



          }


          /* --------------------------------------------------------
             NO PROFILE PICTURE
             -------------------------------------------------------- */

          else {

            if (profileAvatar) {

              profileAvatar.removeAttribute('src');

              profileAvatar.style.display =
                'none';

            }

            if (profileInitial) {

              profileInitial.style.display =
                'grid';

            }


            if (settingsAvatarImage) {

              settingsAvatarImage.removeAttribute(
                'src'
              );

              settingsAvatarImage.style.display =
                'none';

            }

            if (settingsInitial) {

              settingsInitial.style.display =
                'block';

            }

          }

          /* --------------------------------------------------------
     DROPDOWN PROFILE PICTURE
     -------------------------------------------------------- */

          if (dropdownProfileAvatar) {

            if (
              user.profilePicture &&
              typeof user.profilePicture === 'string'
            ) {

              dropdownProfileAvatar.src =
                user.profilePicture;

              dropdownProfileAvatar.style.display =
                'block';

              if (dropdownProfileInitial) {
                dropdownProfileInitial.style.display =
                  'none';
              }

            } else {

              dropdownProfileAvatar.removeAttribute('src');

              dropdownProfileAvatar.style.display =
                'none';

              if (dropdownProfileInitial) {
                dropdownProfileInitial.style.display =
                  'block';
              }

            }
          }

        }


        /* Render immediately */

        renderProfile();


        /* Account menu events are delegated in the final script at the end of this page. */


        /* ==========================================================
     PROFILE PHOTO EDIT MENU
     ========================================================== */

        profileEditBtn?.addEventListener(
          'click',
          function (event) {

            event.preventDefault();
            event.stopPropagation();

            profilePhotoMenu?.classList.toggle('show');

          }
        );


        /* ==========================================================
           CHANGE PROFILE PICTURE
           ========================================================== */

        changeProfilePictureBtn?.addEventListener(
          'click',
          function (event) {

            event.preventDefault();
            event.stopPropagation();

            profilePhotoMenu?.classList.remove('show');

            profilePictureInput?.click();

          }
        );


        /* ==========================================================
           DELETE PROFILE PICTURE
           ========================================================== */

        deleteProfilePictureBtn?.addEventListener(
          'click',
          async function (event) {

            event.preventDefault();
            event.stopPropagation();

            profilePhotoMenu?.classList.remove('show');

            if (!user?.profilePicture) {
              return;
            }

            const confirmed =
              confirm('Delete your profile picture?');

            if (!confirmed) {
              return;
            }

            /* Use your existing remove-picture logic */
            removeProfilePictureBtn?.click();

          }
        );


        /* ==========================================================
           OPEN SETTINGS
           ========================================================== */

        settingsBtn?.addEventListener(
          'click',
          function (event) {

            event.preventDefault();

            event.stopPropagation();


            /* Close profile dropdown */

            profileDropdown?.classList.remove('show');
            profileBtn?.setAttribute('aria-expanded', 'false');


            /* Open settings */

            settingsModal?.classList.add(
              'show'
            );


            if (profilePictureStatus) {

              profilePictureStatus.textContent =
                '';

            }

          }
        );


        /* ==========================================================
           CLOSE SETTINGS
           ========================================================== */

        function closeSettings() {

          settingsModal?.classList.remove(
            'show'
          );

        }


        closeSettingsBtn?.addEventListener(
          'click',
          closeSettings
        );


        /* Click outside modal */

        settingsModal?.addEventListener(
          'click',
          function (event) {

            if (
              event.target === settingsModal
            ) {

              closeSettings();

            }

          }
        );


        /* ESC key */

        document.addEventListener(
          'keydown',
          function (event) {

            if (
              event.key === 'Escape' &&
              settingsModal?.classList.contains('show')
            ) {

              closeSettings();

            }

          }
        );


        /* ==========================================================
           COMPRESS PROFILE PICTURE
           ========================================================== */

        function compressProfilePicture(file) {

          return new Promise(
            function (resolve, reject) {

              const reader =
                new FileReader();


              reader.onload =
                function () {

                  const image =
                    new Image();


                  image.onload =
                    function () {

                      /*
                         Profile picture does NOT need
                         high resolution.
    
                         Final image:
                         128 × 128
    
                         This drastically reduces
                         database storage.
                      */

                      const SIZE = 128;


                      const canvas =
                        document.createElement(
                          'canvas'
                        );

                      canvas.width =
                        SIZE;

                      canvas.height =
                        SIZE;


                      const ctx =
                        canvas.getContext(
                          '2d'
                        );


                      /*
                         High quality image
                         smoothing before resize.
                      */

                      ctx.imageSmoothingEnabled =
                        true;

                      ctx.imageSmoothingQuality =
                        'high';


                      /*
                         Cover crop.
    
                         This keeps the image
                         square without stretching.
                      */

                      const scale =
                        Math.max(
                          SIZE / image.width,
                          SIZE / image.height
                        );


                      const width =
                        image.width * scale;

                      const height =
                        image.height * scale;


                      const x =
                        (SIZE - width) / 2;

                      const y =
                        (SIZE - height) / 2;


                      ctx.drawImage(
                        image,
                        x,
                        y,
                        width,
                        height
                      );


                      /*
                         Convert to WebP.
    
                         WebP is considerably smaller
                         than keeping the original image.
    
                         Quality 0.60 is enough for
                         a small profile avatar.
                      */

                      const compressed =
                        canvas.toDataURL(
                          'image/webp',
                          0.60
                        );


                      resolve(
                        compressed
                      );

                    };


                  image.onerror =
                    function () {

                      reject(
                        new Error(
                          'Unable to read image'
                        )
                      );

                    };


                  image.src =
                    reader.result;

                };


              reader.onerror =
                function () {

                  reject(
                    new Error(
                      'Unable to read selected file'
                    )
                  );

                };


              reader.readAsDataURL(
                file
              );

            }
          );

        }


        /* ==========================================================
           SAVE PROFILE PICTURE TO BACKEND
           ========================================================== */

        async function saveProfilePicture(
          compressedImage
        ) {

          const token =
            localStorage.getItem('token');


          if (!token) {

            throw new Error(
              'Your login session has expired. Please login again.'
            );

          }


          const response =
            await fetch(
              `${API_BASE}/api/auth/profile-picture`,
              {

                method: 'PUT',

                headers: {

                  'Content-Type':
                    'application/json',

                  'Authorization':
                    `Bearer ${token}`

                },

                body: JSON.stringify({

                  profilePicture:
                    compressedImage

                })

              }
            );


          let data = null;


          try {

            data =
              await response.json();

          } catch (error) {

            data = null;

          }


          if (!response.ok) {

            throw new Error(
              data?.message ||
              'Unable to save profile picture'
            );

          }


          return data;

        }


        /* ==========================================================
           PROFILE PICTURE SELECT
           ========================================================== */

        profilePictureInput?.addEventListener(
          'change',
          async function () {

            const file =
              this.files?.[0];


            if (!file) return;


            /* --------------------------------------------------------
               Validate file
               -------------------------------------------------------- */

            if (
              !file.type.startsWith(
                'image/'
              )
            ) {

              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'Please select an image file.';

              }

              this.value = '';

              return;

            }


            try {

              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'Compressing picture...';

              }


              /* ------------------------------------------------------
                 Compress locally
    
                 Original file NEVER gets sent.
                 Only the compressed WebP is sent.
                 ------------------------------------------------------ */

              const compressedImage =
                await compressProfilePicture(
                  file
                );


              /* ------------------------------------------------------
                 Check compressed size
    
                 Base64 is slightly larger than
                 the binary WebP, but our limit is
                 still very small.
                 ------------------------------------------------------ */

              const approxBytes =
                Math.ceil(
                  compressedImage.length * 0.75
                );


              if (
                approxBytes > 75000
              ) {

                throw new Error(
                  'Compressed profile picture is still too large.'
                );

              }


              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'Saving profile picture...';

              }


              /* ------------------------------------------------------
                 Send to backend
                 ------------------------------------------------------ */

              const data =
                await saveProfilePicture(
                  compressedImage
                );


              /* ------------------------------------------------------
                 Update localStorage
                 ------------------------------------------------------ */

              if (data?.user) {

                user =
                  data.user;

                localStorage.setItem(
                  'user',
                  JSON.stringify(user)
                );

              }
              else {

                /*
                   Fallback in case backend doesn't
                   return complete user object.
                */

                user.profilePicture =
                  compressedImage;

                localStorage.setItem(
                  'user',
                  JSON.stringify(user)
                );

              }


              /* ------------------------------------------------------
                 Update UI immediately
                 ------------------------------------------------------ */

              renderProfile();


              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'Profile picture updated ✓';

              }


              /* Allow selecting same image again */

              this.value = '';


            } catch (error) {

              console.error(
                'Profile picture error:',
                error
              );


              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  error.message ||
                  'Unable to update profile picture';

              }


              this.value = '';

            }

          }
        );


        /* ==========================================================
           REMOVE PROFILE PICTURE
           ========================================================== */

        removeProfilePictureBtn?.addEventListener(
          'click',
          async function () {

            if (
              !user ||
              !user.profilePicture
            ) {

              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'No profile picture to remove.';

              }

              return;

            }


            try {

              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'Removing picture...';

              }


              const token =
                localStorage.getItem(
                  'token'
                );


              if (!token) {

                throw new Error(
                  'Your login session has expired. Please login again.'
                );

              }


              const response =
                await fetch(
                  `${API_BASE}/api/auth/profile-picture`,
                  {

                    method: 'PUT',

                    headers: {

                      'Content-Type':
                        'application/json',

                      'Authorization':
                        `Bearer ${token}`

                    },

                    body: JSON.stringify({

                      profilePicture:
                        null

                    })

                  }
                );


              let data = null;


              try {

                data =
                  await response.json();

              } catch (error) {

                data = null;

              }


              if (!response.ok) {

                throw new Error(
                  data?.message ||
                  'Unable to remove profile picture'
                );

              }


              /* Update user */

              if (data?.user) {

                user =
                  data.user;

              }
              else {

                user.profilePicture =
                  null;

              }


              localStorage.setItem(
                'user',
                JSON.stringify(user)
              );


              /* Update UI */

              renderProfile();


              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  'Profile picture removed ✓';

              }

            } catch (error) {

              console.error(
                'Remove profile picture error:',
                error
              );


              if (profilePictureStatus) {

                profilePictureStatus.textContent =
                  error.message ||
                  'Unable to remove profile picture';

              }

            }

          }
        );



        /* ==========================================================
           LOGOUT
           ========================================================== */

        document
          .getElementById('logoutBtn')
          ?.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            const accountMenu = document.getElementById('profileDropdown');
            accountMenu?.classList.remove('show');
            if (accountMenu) {
              accountMenu.hidden = true;
              accountMenu.style.removeProperty('display');
              accountMenu.style.removeProperty('visibility');
              accountMenu.style.removeProperty('opacity');
            }
            document.getElementById('sidebarProfileBtn')?.setAttribute('aria-expanded', 'false');

            // Clear the local session and return to the login page.
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();

            const loginUrl = new URL(ROOT + 'login.html', window.location.href);
            window.location.replace(loginUrl.href);
          });

  }

  /* ============================================================
     ACCOUNT MENU — placement/open/close identical to the homepage
     ============================================================ */
  function initAccountMenu() {
    const trigger = document.getElementById('sidebarProfileBtn');
    const menu = document.getElementById('profileDropdown');
    if (!trigger || !menu) return;

    // Keep the menu under <body> to escape sidebar clipping.
    if (menu.parentElement !== document.body) document.body.appendChild(menu);

    function positionMenu() {
      const anchor = trigger.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 24);
      const height = menu.getBoundingClientRect().height || 260;
      const gap = 18;
      const cursorClearance = 42;
      let left = anchor.right + gap;
      if (left + width > window.innerWidth - 12) left = anchor.left - width - gap;
      if (left < 12) left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
      let top = anchor.top - height - cursorClearance;
      if (top < 12) top = anchor.bottom + cursorClearance;
      top = Math.max(12, Math.min(top, window.innerHeight - height - 12));
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      menu.style.setProperty('position', 'fixed', 'important');
      menu.style.setProperty('left', left + 'px', 'important');
      menu.style.setProperty('top', top + 'px', 'important');
      menu.style.setProperty('right', 'auto', 'important');
      menu.style.setProperty('bottom', 'auto', 'important');
      menu.style.setProperty('width', width + 'px', 'important');
      menu.style.setProperty('max-height', 'min(72vh, 520px)', 'important');
      menu.style.setProperty('overflow-y', 'auto', 'important');
      menu.style.setProperty('z-index', '2147483000', 'important');
    }
    function openMenu() {
      menu.hidden = false;
      menu.classList.add('show');
      menu.style.setProperty('display', 'block', 'important');
      menu.style.setProperty('visibility', 'visible', 'important');
      menu.style.setProperty('opacity', '1', 'important');
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => { positionMenu(); requestAnimationFrame(positionMenu); });
    }
    function closeMenu() {
      menu.classList.remove('show');
      menu.style.removeProperty('display');
      menu.style.removeProperty('visibility');
      menu.style.removeProperty('opacity');
      trigger.setAttribute('aria-expanded', 'false');
      document.getElementById('profilePhotoMenu')?.classList.remove('show');
    }
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (menu.classList.contains('show')) closeMenu(); else openMenu();
    });
    menu.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (menu.classList.contains('show')) positionMenu(); });
    window.addEventListener('scroll', () => { if (menu.classList.contains('show')) positionMenu(); }, true);
  }

  /* ============================================================
     MOBILE MENU
     ============================================================ */
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('appSidebar') || document.querySelector('.app-sidebar');
    if (!btn || !sidebar) return;
    btn.addEventListener('click', event => {
      event.stopPropagation();
      sidebar.classList.toggle('mobile-open');
    });
    document.addEventListener('click', event => {
      if (sidebar.classList.contains('mobile-open') && !sidebar.contains(event.target) && !btn.contains(event.target)) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }

  /* ============================================================
     PDFnestUI — result panel:  operation → PREVIEW → download / send
     ============================================================ */
  const UI = window.PDFnestUI = {};

  UI.fmtSize = function (n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  };

  UI.download = function (blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  UI.zip = async function (outputs, zipName) {
    if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const zip = new window.JSZip();
    const used = new Set();
    outputs.forEach((o, i) => {
      let name = o.fileName || ('file-' + (i + 1));
      while (used.has(name)) name = (i + 1) + '-' + name;
      used.add(name);
      zip.file(name, o.blob);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    UI.download(blob, zipName || 'PDFnest-files.zip');
  };

  const kindOf = o => {
    const reg = window.PDFnestToolRegistry;
    if (reg) return reg.kindOf({ name: o.fileName }, o.mimeType || (o.blob && o.blob.type));
    const t = String(o.mimeType || (o.blob && o.blob.type) || '');
    return t.startsWith('image/') ? 'image' : t === 'application/pdf' ? 'pdf' : 'other';
  };

  async function buildPreview(o, urls, compact) {
    const kind = kindOf(o);
    const box = document.createElement('div');
    box.className = 'result-preview-item result-preview-' + kind;
    if (kind === 'image') {
      const url = URL.createObjectURL(o.blob); urls.push(url);
      const img = document.createElement('img');
      img.src = url; img.alt = o.fileName;
      box.appendChild(img);
    } else if (kind === 'pdf') {
      try { await renderPdfPreview(o, box, compact); }
      catch (e) { console.warn('PDF preview failed', e); box.appendChild(fileCard(o)); }
    } else if (kind === 'docx' && window.mammoth) {
      try {
        const res = await window.mammoth.convertToHtml({ arrayBuffer: await o.blob.arrayBuffer() });
        const doc = document.createElement('div');
        doc.className = 'result-doc';
        doc.innerHTML = res.value || '<p>(The document has no text to preview.)</p>';
        box.appendChild(doc);
      } catch (e) { box.appendChild(fileCard(o)); }
    } else if (kind === 'text') {
      const pre = document.createElement('pre');
      pre.className = 'result-text';
      pre.textContent = (await o.blob.text()).slice(0, 6000);
      box.appendChild(pre);
    } else {
      box.appendChild(fileCard(o));
    }
    return box;
  }


  /* PDF preview drawn with pdf.js (works on every browser and never triggers a download) */
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  async function renderPdfPreview(o, box, compact) {
    if (!window.pdfjsLib) await loadScript(PDFJS + 'pdf.min.js');
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await o.blob.arrayBuffer()) }).promise;
    const show = Math.min(pdf.numPages, compact ? 1 : 8);
    const wrap = document.createElement('div');
    wrap.className = 'result-pages';
    for (let i = 1; i <= show; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: compact ? 0.8 : 1.4 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      wrap.appendChild(canvas);
    }
    const note = document.createElement('p');
    note.className = 'result-pages-note';
    note.textContent = pdf.numPages + (pdf.numPages === 1 ? ' page' : ' pages') +
      (pdf.numPages > show ? ' · showing the first ' + show + ' — download to see all' : '');
    box.appendChild(wrap);
    box.appendChild(note);
  }

  function fileCard(o) {
    const c = document.createElement('div');
    c.className = 'result-filecard';
    c.innerHTML = '<span class="result-fileicon">📄</span><strong></strong><small></small>';
    c.querySelector('strong').textContent = o.fileName;
    c.querySelector('small').textContent = UI.fmtSize(o.blob.size) + ' · preview not available for this type';
    return c;
  }

  let activePanel = null;

  UI.hideResult = function () {
    if (!activePanel) return;
    activePanel.urls.forEach(u => URL.revokeObjectURL(u));
    activePanel.el.remove();
    activePanel = null;
  };

  /* opts: { outputs:[{blob,fileName,mimeType}], title?, note?, zipName? } */
  UI.showResult = async function (opts) {
    const outputs = (opts.outputs || []).filter(o => o && o.blob).map(o => ({
      blob: o.blob, fileName: o.fileName || 'file', mimeType: o.mimeType || o.blob.type || 'application/octet-stream'
    }));
    if (!outputs.length) return;
    UI.hideResult();

    const many = outputs.length > 1;
    const total = outputs.reduce((n, o) => n + o.blob.size, 0);
    const kinds = outputs.map(kindOf);
    const noun = kinds.every(k => k === kinds[0]) ? ({ pdf: 'PDF', image: 'image', docx: 'Word file', text: 'text file' }[kinds[0]] || 'file') : 'file';

    const panel = document.createElement('section');
    panel.className = 'card result-panel';
    panel.id = 'resultPanel';
    panel.innerHTML =
      '<div class="result-head">' +
      '<div class="result-title"><span class="result-badge">✓ Ready</span>' +
      '<h3></h3><p class="result-meta"></p></div>' +
      '<div class="result-actions"></div></div>' +
      '<div class="result-body"></div>';
    panel.querySelector('h3').textContent = opts.title || (many ? 'Your ' + outputs.length + ' ' + noun + 's are ready' : 'Your ' + noun + ' is ready');
    panel.querySelector('.result-meta').textContent =
      (opts.note ? opts.note + ' · ' : '') + (many ? outputs.length + ' files · ' : outputs[0].fileName + ' · ') + UI.fmtSize(total);

    const actions = panel.querySelector('.result-actions');
    const dl = document.createElement('button');
    dl.type = 'button'; dl.className = 'btn btn-primary';
    dl.textContent = many ? '⬇ Download all (ZIP)' : '⬇ Download';
    dl.addEventListener('click', async () => {
      try {
        if (many) { dl.disabled = true; await UI.zip(outputs, opts.zipName); dl.disabled = false; }
        else UI.download(outputs[0].blob, outputs[0].fileName);
      } catch (e) { dl.disabled = false; alert(e.message || 'Download failed'); }
    });
    actions.appendChild(dl);
    if (window.ToolBridge) actions.appendChild(window.ToolBridge.createSendButton(() => outputs, { label: many ? 'Send all to…' : 'Send to…', key: 'result' }));
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'btn btn-ghost result-close'; close.setAttribute('aria-label', 'Close result'); close.textContent = '✕';
    close.addEventListener('click', UI.hideResult);
    actions.appendChild(close);

    const urls = [];
    const body = panel.querySelector('.result-body');
    if (many) {
      body.classList.add('result-grid');
      for (const o of outputs) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.appendChild(await buildPreview(o, urls, true));
        const info = document.createElement('div');
        info.className = 'result-item-info';
        info.innerHTML = '<strong></strong><small></small>';
        info.querySelector('strong').textContent = o.fileName;
        info.querySelector('small').textContent = UI.fmtSize(o.blob.size);
        const row = document.createElement('div');
        row.className = 'result-item-actions';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-ghost'; b.textContent = '⬇ Download';
        b.addEventListener('click', () => UI.download(o.blob, o.fileName));
        row.appendChild(b);
        if (window.ToolBridge) row.appendChild(window.ToolBridge.createSendButton(() => o, { compact: true, label: 'Send to…', key: 'item' }));
        info.appendChild(row);
        item.appendChild(info);
        body.appendChild(item);
      }
    } else {
      body.appendChild(await buildPreview(outputs[0], urls));
    }

    if (opts.modal) {
      // full-screen tools (the PDF editor) show the result in an overlay
      const overlay = document.createElement('div');
      overlay.className = 'result-modal';
      overlay.appendChild(panel);
      overlay.addEventListener('click', e => { if (e.target === overlay) UI.hideResult(); });
      document.body.appendChild(overlay);
      activePanel = { el: overlay, urls };
    } else {
      // place directly under the tool's main card
      const main = document.querySelector('main.workspace-content') || document.querySelector('main') || document.body;
      const cards = main.querySelectorAll(':scope > .card, :scope > div > .card');
      const anchor = opts.after || cards[0];
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
      else main.appendChild(panel);
      activePanel = { el: panel, urls };
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activePanel && activePanel.el.classList.contains('result-modal')) UI.hideResult();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();