import { populateProfileDropdown, setupProfileEventListeners, setActiveProfileName, getSavedProfiles, saveProfiles } from '../../utils/profile-manager.js';
import { displayMessageBox } from '../../utils/ui-helper.js';

/**
 * Initializes the hamburger menu and sets up its functionality, including dark mode and profile management.
 * @param {Function} onProfileChangeCallback - A callback function to be executed when the active profile changes or on initial load.
 */
export const initHamburgerMenu = (onProfileChangeCallback) => {
  const fetchPath = '/pages/hamburger-menu.html';

  fetch(fetchPath)
    .then(response => {
      if (!response.ok) {
        console.error(`[hamburger-menu.js] Failed to fetch hamburger-menu.html. Status: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      document.body.insertAdjacentHTML('afterbegin', data);

      const hamburgerMenu = document.getElementById("hamburgerMenu");
      const sideNav = document.getElementById("sideNav");
      const menuOverlay = document.getElementById("menuOverlay");
      const body = document.body;
      const darkModeToggle = document.getElementById('darkModeToggle');

      if (!hamburgerMenu || !sideNav || !menuOverlay || !body || !darkModeToggle) {
          console.error("[hamburger-menu.js] One or more essential menu elements were not found in the DOM after insertion.");
          return;
      }

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        darkModeToggle.checked = true;
      }

      darkModeToggle.addEventListener('change', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
      });

      hamburgerMenu.addEventListener("click", () => {
        sideNav.classList.toggle("open");
        menuOverlay.classList.toggle("visible");
        body.classList.toggle("menu-open");
      });

      menuOverlay.addEventListener("click", () => {
        sideNav.classList.remove("open");
        menuOverlay.classList.remove("visible");
        body.classList.remove("menu-open");
      });

      const storyParent = document.querySelector('.story-parent');
      if (storyParent) {
        storyParent.addEventListener('click', function(e) {
          if (e.target.closest('.story-header')) {
            this.classList.toggle('active');
          } else if (e.target.closest('.story-submenu a')) {
            if (sideNav && menuOverlay && body) {
              sideNav.classList.remove("open");
              menuOverlay.classList.remove("visible");
              body.classList.remove("menu-open");
            }
          }
        });
      }

      document.addEventListener('click', function(e) {
        if (sideNav && hamburgerMenu && !sideNav.contains(e.target) && !hamburgerMenu.contains(e.target)) {
          sideNav.classList.remove("open");
          document.getElementById("menuOverlay").classList.remove("visible");
          document.body.classList.remove("menu-open");
        }
      });

      const profileSelect = document.getElementById("profileSelect");
      if (profileSelect) {
        populateProfileDropdown(profileSelect);
        setupProfileEventListeners(displayMessageBox, onProfileChangeCallback);

        const profiles = getSavedProfiles();
        if (Object.keys(profiles).length === 0) {
          const defaultProfileName = "Default Profile";
          profiles[defaultProfileName] = {};
          saveProfiles(profiles);
          setActiveProfileName(defaultProfileName);
          populateProfileDropdown(profileSelect);
          displayMessageBox(`No profiles found. Created a "${defaultProfileName}" profile.`, "info");
        }
      } else {
          console.error("[hamburger-menu.js] Profile select dropdown not found.");
      }

      if (onProfileChangeCallback && typeof onProfileChangeCallback === 'function') {
          onProfileChangeCallback();
      } else {
          console.error("[hamburger-menu.js] onProfileChangeCallback is not a valid function.");
      }
    })
    .catch(error => console.error('[hamburger-menu.js] CRITICAL ERROR loading hamburger menu:', error));
};
