const ALL_PROFILES_STORAGE_KEY = "pokedexAppProfiles";
const ACTIVE_PROFILE_NAME_KEY = "activePokedexAppProfile";

export const getSavedProfiles = () => {
    try {
        return JSON.parse(localStorage.getItem(ALL_PROFILES_STORAGE_KEY)) || {};
    } catch (e) {
        console.error("Error parsing profiles from localStorage:", e);
        return {};
    }
};

export const saveProfiles = (profiles) => {
    try {
        localStorage.setItem(ALL_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
        console.error("Error saving profiles to localStorage:", e);
    }
};

export const getActiveProfileName = () => {
    return localStorage.getItem(ACTIVE_PROFILE_NAME_KEY);
};

export const setActiveProfileName = (profileName) => {
    if (profileName) {
        localStorage.setItem(ACTIVE_PROFILE_NAME_KEY, profileName);
    } else {
        localStorage.removeItem(ACTIVE_PROFILE_NAME_KEY);
    }
};

export const getProfileData = (dataKey, defaultValue) => {
    const activeProfileName = getActiveProfileName();
    if (!activeProfileName) {
        return defaultValue;
    }
    const profiles = getSavedProfiles();
    const activeProfile = profiles[activeProfileName];
    if (activeProfile && activeProfile[dataKey] !== undefined) {
        return activeProfile[dataKey];
    }
    return defaultValue;
};

export const saveProfileData = (dataKey, data) => {
    const activeProfileName = getActiveProfileName();
    if (!activeProfileName) {
        console.warn(`No active profile set. Cannot save data for key: ${dataKey}`);
        return;
    }
    const profiles = getSavedProfiles();
    if (!profiles[activeProfileName]) {
        profiles[activeProfileName] = {};
    }
    profiles[activeProfileName][dataKey] = data;
    saveProfiles(profiles);
};

export const populateProfileDropdown = (profileSelectElement) => {
    const profiles = getSavedProfiles();
    const activeProfile = getActiveProfileName();

    while (profileSelectElement.options.length > 1) {
        profileSelectElement.remove(1);
    }

    Object.keys(profiles).forEach(profileName => {
        const option = document.createElement("option");
        option.value = profileName;
        option.textContent = profileName;
        profileSelectElement.appendChild(option);
    });

    if (activeProfile && profiles[activeProfile]) {
        profileSelectElement.value = activeProfile;
    } else if (Object.keys(profiles).length > 0) {
        const firstProfileName = Object.keys(profiles)[0];
        setActiveProfileName(firstProfileName);
        profileSelectElement.value = firstProfileName;
    }
};

export const createProfile = (newProfileName, displayMessageBox, onProfileChangeCallback) => {
    if (!newProfileName) {
        displayMessageBox("Please enter a profile name.", "error");
        return;
    }

    const profiles = getSavedProfiles();
    if (profiles[newProfileName]) {
        displayMessageBox("A profile with this name already exists.", "error");
        return;
    }

    profiles[newProfileName] = {};
    saveProfiles(profiles);
    setActiveProfileName(newProfileName);
    populateProfileDropdown(document.getElementById("profileSelect"));

    document.getElementById("newProfileName").value = "";

    displayMessageBox(`Profile "${newProfileName}" created and activated!`, "success");

    if (onProfileChangeCallback && typeof onProfileChangeCallback === 'function') {
        onProfileChangeCallback();
    }
};

export const deleteProfile = (displayMessageBox, onProfileChangeCallback) => {
    const profileSelect = document.getElementById("profileSelect");
    const profileToDelete = profileSelect.value;

    if (!profileToDelete) {
        displayMessageBox("Please select a profile to delete.", "error");
        return;
    }

    if (!confirm(`Are you sure you want to delete the profile "${profileToDelete}"? This action cannot be undone.`)) {
        return;
    }

    const profiles = getSavedProfiles();
    delete profiles[profileToDelete];
    saveProfiles(profiles);

    if (getActiveProfileName() === profileToDelete) {
        setActiveProfileName(null);
    }

    populateProfileDropdown(profileSelect);

    if (Object.keys(profiles).length === 0) {
        displayMessageBox("All profiles deleted. Please create a new one.", "info");
    } else if (!getActiveProfileName()) {
        const firstProfile = Object.keys(profiles)[0];
        setActiveProfileName(firstProfile);
        profileSelect.value = firstProfile;
    }

    displayMessageBox(`Profile "${profileToDelete}" deleted.`, "success");

    if (onProfileChangeCallback && typeof onProfileChangeCallback === 'function') {
        onProfileChangeCallback();
    }
};

export const setupProfileEventListeners = (displayMessageBox, onProfileChangeCallback) => {
    const profileSelect = document.getElementById("profileSelect");
    const newProfileNameInput = document.getElementById("newProfileName");
    const createProfileBtn = document.getElementById("createProfileBtn");
    const deleteProfileBtn = document.getElementById("deleteProfileBtn");

    if (profileSelect) {
        profileSelect.addEventListener("change", (e) => {
            const selectedProfile = e.target.value;
            if (selectedProfile) {
                setActiveProfileName(selectedProfile);
                displayMessageBox(`Switched to profile: "${selectedProfile}"`, "info");
                if (onProfileChangeCallback && typeof onProfileChangeCallback === 'function') {
                    onProfileChangeCallback();
                }
            }
        });
    }

    if (createProfileBtn) {
        createProfileBtn.addEventListener("click", () => {
            createProfile(newProfileNameInput.value.trim(), displayMessageBox, onProfileChangeCallback);
        });
    }

    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener("click", () => {
            deleteProfile(displayMessageBox, onProfileChangeCallback);
        });
    }
};
