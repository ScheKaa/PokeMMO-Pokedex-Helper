import { loadPokemonData, POKEMON } from '../../../utils/pokemon.js';
import { getProfileData, saveProfileData } from '../../../utils/profile-manager.js';
import { createMessageBox } from '../../../utils/ui-helper.js';
import { getCurrentIngameTime } from '../../../utils/time-utils.js';
import { findBestCatchingSpots, handleBestSpotsSpriteClick, filterLocationPokemon, createLocationDetailsElement, createCountsContainer, createLocationSearchInput, createLocationPokemonEntry, groupPokemonByLocation, sortLocationPokemon } from './catching-spot-display-utils.js';
import { populateFilters, setupEventListeners } from './event-handlers.js';
import { displayPokemon, updateCaughtPokemonCount, updateEarliestCaughtInfo } from './pokemon-display-utils.js';
import { getFilteredPokemon, getSortedPokemon } from './filter-utils.js';


let lastKnownIngamePeriod = localStorage.getItem('lastKnownIngamePeriod');
export let pokedexStatus = {};

export const checkIngameTimeChange = (bestCatchingSpotsContainer, createMessageBox, findBestCatchingSpots) => {
    const { period: currentIngamePeriod } = getCurrentIngameTime();
    if (lastKnownIngamePeriod && lastKnownIngamePeriod !== currentIngamePeriod) {
        createMessageBox('info', 'The in-game daytime has changed. Refreshing the best catching spots list...');
        findBestCatchingSpots();
    }
    localStorage.setItem('lastKnownIngamePeriod', currentIngamePeriod);
    lastKnownIngamePeriod = currentIngamePeriod;
};

export async function initializeApp(pokedexGrid, pokemonCountElement, earliestCaughtInfoElement, caughtPokemonCountElement, bestCatchingSpotsContainer, catchingMethodSwitch, displayProbabilitiesSwitch, displayMoreInfoSwitch, filterRegionElement, filterEncounterTriggerElement, filterEncounterTypeElement, searchInputElement, filterCaughtElement, filterCanBeCaughtElement, filterCaughtDateElement, sortCaughtDateElement, exportPokedexBtn, importPokedexBtn, togglePokedexBtn, findBestCatchingSpotsBtn, regionCheckboxesContainer, catchingSpotSearchInput) { // Removed pokedexStatus from parameters
    try {
        await loadPokemonData();

        let currentPokedexStatus = getProfileData('pokedexStatus', null);
        if (!currentPokedexStatus) {
            currentPokedexStatus = {};
            POKEMON.forEach((p) => {
                currentPokedexStatus[p.id] = { id: p.id, name: p.name, caught: false, timestamp: null };
            });
            saveProfileData('pokedexStatus', currentPokedexStatus);
        }
        pokedexStatus = currentPokedexStatus;

        // Load switch states from local storage
        const savedCatchingMethod = localStorage.getItem('catchingMethod');
        if (savedCatchingMethod !== null) {
            catchingMethodSwitch.checked = JSON.parse(savedCatchingMethod);
        } else {
            catchingMethodSwitch.checked = false; // Default to Fastest
        }

        const savedDisplayProbabilities = localStorage.getItem('displayProbabilities');
        if (savedDisplayProbabilities !== null) {
            displayProbabilitiesSwitch.checked = JSON.parse(savedDisplayProbabilities);
        } else {
            displayProbabilitiesSwitch.checked = false; // Default to Yes
        }

        const savedDisplayMoreInfo = localStorage.getItem('displayMoreInfo');
        if (savedDisplayMoreInfo !== null) {
            displayMoreInfoSwitch.checked = JSON.parse(savedDisplayMoreInfo);
        } else {
            displayMoreInfoSwitch.checked = true; // Default to No
        }

        // Helper functions to simplify passing arguments, defined AFTER pokedexStatus is initialized
        const getFilteredPokemonFn = () => getFilteredPokemon(searchInputElement, filterRegionElement, filterEncounterTriggerElement, filterEncounterTypeElement, filterCaughtElement, filterCanBeCaughtElement, filterCaughtDateElement, pokedexStatus);
        const getSortedPokemonFn = (list) => getSortedPokemon(list, sortCaughtDateElement, filterRegionElement, pokedexStatus);

        const displayPokemonWrapper = () => displayPokemon(pokedexGrid, pokemonCountElement, filterRegionElement, pokedexStatus, getFilteredPokemonFn, getSortedPokemonFn, updateCaughtPokemonCount, updateEarliestCaughtInfo);

        const findBestCatchingSpotsWrapper = () => findBestCatchingSpots(bestCatchingSpotsContainer, filterRegionElement, pokedexStatus, regionCheckboxesContainer, catchingMethodSwitch, displayProbabilitiesSwitch, displayMoreInfoSwitch, filterLocationPokemon, createLocationDetailsElement, createCountsContainer, createLocationSearchInput, sortLocationPokemon, createLocationPokemonEntry, groupPokemonByLocation);

        const handleBestSpotsSpriteClickWrapper = (e) => handleBestSpotsSpriteClick(e, pokedexStatus, saveProfileData, displayPokemonWrapper, findBestCatchingSpotsWrapper);

        populateFilters(filterRegionElement, filterEncounterTriggerElement, filterEncounterTypeElement, regionCheckboxesContainer);
        setupEventListeners(pokedexGrid, bestCatchingSpotsContainer, catchingSpotSearchInput, togglePokedexBtn, findBestCatchingSpotsBtn, exportPokedexBtn, importPokedexBtn, searchInputElement, filterRegionElement, filterEncounterTriggerElement, filterEncounterTypeElement, filterCaughtElement, filterCanBeCaughtElement, filterCaughtDateElement, sortCaughtDateElement, catchingMethodSwitch, displayProbabilitiesSwitch, displayMoreInfoSwitch, displayPokemonWrapper, handleBestSpotsSpriteClickWrapper, findBestCatchingSpotsWrapper); // Pass displayPokemonWrapper
        
        displayPokemonWrapper();
        setInterval(() => checkIngameTimeChange(bestCatchingSpotsContainer, createMessageBox, findBestCatchingSpotsWrapper), 30 * 1000);
    } catch (error) {
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-size: 1.2em; color: red;">
            <h1>Application Error</h1>
            <p>Could not load essential Pokémon data. Please check the console for details.</p>
            <p><em>${error.message}</em></p>
        </div>`;
        console.error("Pokedex Helper initialization failed:", error);
    }
}
