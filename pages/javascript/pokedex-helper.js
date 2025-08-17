import { loadPokemonData, POKEMON, getPokeDexID } from '../../utils/pokemon.js';
import {
    REGIONS,
    ENCOUNTER_TRIGGERS,
    ENCOUNTER_TYPE,
} from "../../utils/location.js";
import { exportPokedexData, importPokedexData } from "../../utils/import-export.js";
import { getBestCatchingProbabilities, getTop4CostEfficientBalls, getFastestCatchEstimates } from "../../utils/bestCatcher.js";
import { getEvolutionLine, getEvolutionMessages, filterLocationsByTimeAndSeason, getCurrentIngameTime, getRarityColor } from '../../utils/dex-helper-utils.js';
import { initHamburgerMenu } from './hamburger-menu.js';
import { getProfileData, saveProfileData, getActiveProfileName } from '../../utils/profile-manager.js';
import { displayMessageBox, createMessageBox } from '../../utils/ui-helper.js';

const pokedexGrid = document.getElementById("pokedexGrid");
const pokemonCountElement = document.getElementById("pokemonCount");
const earliestCaughtInfoElement = document.getElementById("earliestCaughtInfo");
const caughtPokemonCountElement = document.getElementById("caughtPokemonCount");
const bestCatchingSpotsContainer = document.getElementById("bestCatchingSpots");
const catchingMethodSwitch = document.getElementById("catchingMethodSwitch");
const displayProbabilitiesSwitch = document.getElementById("displayProbabilitiesSwitch");
const displayMoreInfoSwitch = document.getElementById("displayMoreInfoSwitch");
const filterRegionElement = document.getElementById("filterRegion");
const filterEncounterTriggerElement = document.getElementById("filterEncounterTrigger");
const filterEncounterTypeElement = document.getElementById("filterEncounterType");
const searchInputElement = document.getElementById("search");
const filterCaughtElement = document.getElementById("filterCaught");
const filterCanBeCaughtElement = document.getElementById("filterCanBeCaught");
const filterCaughtDateElement = document.getElementById("filterCaughtDate");
const sortCaughtDateElement = document.getElementById("sortCaughtDate");
const exportPokedexBtn = document.getElementById("exportPokedexBtn");
const importPokedexBtn = document.getElementById("importPokedexBtn");
const togglePokedexBtn = document.getElementById("togglePokedex");
const findBestCatchingSpotsBtn = document.getElementById("findBestCatchingSpots");
const regionCheckboxesContainer = document.getElementById("regionCheckboxes");
const catchingSpotSearchInput = document.getElementById("catchingSpotSearch");

let pokedexStatus = {};

const loadPokemonSprite = (spriteElement, pokemon) => {
    const formatPokemonNameForSprite = (name) => {
        return name.toLowerCase()
                    .replace(/♀/g, '-f')
                    .replace(/♂/g, '-m')
                    .replace(/\s/g, '-')
                    .replace(/['.]/g, '');
    };

    const formattedName = formatPokemonNameForSprite(pokemon.name);

    spriteElement.src = `https://img.pokemondb.net/sprites/black-white/anim/normal/${formattedName}.gif`;
    spriteElement.onerror = () => {
        spriteElement.src = `https://img.pokemondb.net/sprites/home/normal/${formattedName}.png`;
        spriteElement.onerror = () => {
            spriteElement.onerror = null;
        };
    };
};

const getFilteredPokemon = () => {
    const searchTerm = searchInputElement.value.toLowerCase();
    const regionFilter = filterRegionElement.value;
    const triggerFilter = filterEncounterTriggerElement.value;
    const typeFilter = filterEncounterTypeElement.value;
    const caughtFilter = filterCaughtElement.value;
    const canBeCaughtFilter = document.getElementById("filterCanBeCaught").value;
    const caughtDateFilter = filterCaughtDateElement.value;

    return POKEMON.filter((p) => {
        let matchesSearchTerm = false;
        if (!searchTerm) {
            matchesSearchTerm = true;
        } else {
            const searchNum = parseInt(searchTerm, 10);
            if (!isNaN(searchNum)) {
                const idToCheck = regionFilter ? getPokeDexID(p.id, regionFilter) : p.id;
                if (idToCheck !== undefined && idToCheck !== 0 &&
                    (idToCheck === searchNum || String(idToCheck).padStart(3, '0') === searchTerm)) {
                    matchesSearchTerm = true;
                }
            }
            if (!matchesSearchTerm) {
                matchesSearchTerm = p.name.toLowerCase().includes(searchTerm);
            }
        }
        if (!matchesSearchTerm) return false;

        if (regionFilter) {
            const regionalIdForFilter = getPokeDexID(p.id, regionFilter);
            if (regionalIdForFilter === undefined || regionalIdForFilter === 0) {
                return false;
            }
        }

        if (triggerFilter === "Special Only") {
            if (!p.locations || p.locations.length === 0 || !p.locations.every(l => l.rarity.toLowerCase() === "special")) {
                return false;
            }

            const evolutionLineNames = getEvolutionLine(p.id);
            let allEvolutionsSpecialOnly = true;
            for (const evoName of evolutionLineNames) {
                const evoPokemon = POKEMON.find(pk => pk.name === evoName);
                if (evoPokemon) {
                    if (!evoPokemon.locations || evoPokemon.locations.length === 0 || !evoPokemon.locations.every(l => l.rarity.toLowerCase() === "special")) {
                        allEvolutionsSpecialOnly = false;
                        break;
                    }
                }
            }
            if (!allEvolutionsSpecialOnly) {
                return false;
            }

        } else if (triggerFilter) {
            if (!p.locations.some((l) => l.rarity.toLowerCase() === triggerFilter.toLowerCase())) return false;
        }

        if (typeFilter && !p.locations.some((l) => l.type.toLowerCase() === typeFilter.toLowerCase())) return false;

        if (caughtFilter !== "" && pokedexStatus[p.id]?.caught.toString() !== caughtFilter) return false;
        if (canBeCaughtFilter !== "" && (p.locations.length > 0).toString() !== canBeCaughtFilter) return false;

        if (caughtDateFilter) {
            const filterDate = new Date(caughtDateFilter);
            filterDate.setUTCHours(0, 0, 0, 0);
            const pokemonCaughtStatus = pokedexStatus[p.id];
            if (pokemonCaughtStatus?.caught && pokemonCaughtStatus?.timestamp) {
                const caughtDate = new Date(pokemonCaughtStatus.timestamp);
                caughtDate.setUTCHours(0, 0, 0, 0);
                if (caughtDate.getTime() !== filterDate.getTime()) {
                    return false;
                }
            } else {
                return false;
            }
        }
        return true;
    });
};

const getSortedPokemon = (pokemonList) => {
    const sortCaughtDate = sortCaughtDateElement.value;
    const regionFilter = filterRegionElement.value;

    return [...pokemonList].sort((a, b) => {
        if (sortCaughtDate !== "") {
            const aStatus = pokedexStatus[a.id];
            const bStatus = pokedexStatus[b.id];
            const aTimestamp = aStatus?.caught ? new Date(aStatus.timestamp || 0).getTime() : 0;
            const bTimestamp = bStatus?.caught ? new Date(bStatus.timestamp || 0).getTime() : 0;

            if (sortCaughtDate === "caughtAsc") {
                if (aTimestamp === 0 && bTimestamp !== 0) return 1;
                if (aTimestamp !== 0 && bTimestamp === 0) return -1;
                return aTimestamp - bTimestamp;
            } else if (sortCaughtDate === "caughtDesc") {
                if (aTimestamp === 0 && bTimestamp !== 0) return 1;
                if (aTimestamp !== 0 && bTimestamp === 0) return -1;
                return bTimestamp - aTimestamp;
            }
        }

        if (regionFilter) {
            const aRegionalId = getPokeDexID(a.id, regionFilter);
            const bRegionalId = getPokeDexID(b.id, regionFilter);
            const aSortValue = (aRegionalId !== undefined && aRegionalId !== 0) ? aRegionalId : 1000000 + a.id;
            const bSortValue = (bRegionalId !== undefined && bRegionalId !== 0) ? bRegionalId : 1000000 + b.id;
            return aSortValue - bSortValue;
        } else {
            return a.id - b.id;
        }
    });
};

const createPokemonEntry = (p, regionFilter) => {
    const entry = document.createElement("div");
    entry.className = "pokemon-entry";
    entry.dataset.id = p.id;

    const sprite = document.createElement("img");
    sprite.className = "pokemon-sprite";
    sprite.classList.add(pokedexStatus[p.id]?.caught ? "caught" : "not-caught");
    sprite.setAttribute('title', p.name);
    loadPokemonSprite(sprite, p);

    let idToDisplay = p.id;
    if (regionFilter) {
        const regionalId = getPokeDexID(p.id, regionFilter);
        if (regionalId !== undefined && regionalId !== 0) {
            idToDisplay = regionalId;
        }
    }

    const pokemonIdElement = document.createElement("p");
    pokemonIdElement.className = "pokemon-id";
    pokemonIdElement.textContent = String(idToDisplay).padStart(3, "0");

    const name = document.createElement("p");
    name.className = "pokemon-name";
    name.textContent = p.name;
    const hasCatchableLocation = p.locations.some(loc => loc.rarity !== 'Uncatchable' && loc.rarity !== 'Unobtainable');

    if (!hasCatchableLocation) {
        name.style.color = "#FF0000";
    } else if (p.locations && p.locations.length > 0) {
        name.style.color = getRarityColor(p.locations);
    }

    entry.appendChild(sprite);
    entry.appendChild(pokemonIdElement);
    entry.appendChild(name);

    if (pokedexStatus[p.id]?.caught && pokedexStatus[p.id]?.timestamp) {
        const date = new Date(pokedexStatus[p.id].timestamp);
        const formattedDate = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const timestampElement = document.createElement("p");
        timestampElement.className = "pokemon-timestamp";
        timestampElement.textContent = formattedDate;
        entry.appendChild(timestampElement);
    }
    return entry;
};

const displayPokemon = () => {
    pokedexGrid.innerHTML = "";
    const filteredPokemon = getFilteredPokemon();
    const sortedPokemon = getSortedPokemon(filteredPokemon);
    const regionFilter = filterRegionElement.value;

    pokemonCountElement.textContent = `Displaying ${sortedPokemon.length} of ${POKEMON.length} Pokémon`;
    updateCaughtPokemonCount();
    updateEarliestCaughtInfo();

    sortedPokemon.forEach((p) => {
        pokedexGrid.appendChild(createPokemonEntry(p, regionFilter));
    });
};

const updateCaughtPokemonCount = () => {
    const caughtCount = Object.values(pokedexStatus).filter(p => p.caught).length;
    caughtPokemonCountElement.textContent = caughtCount ? `And so far, you've caught ${caughtCount} Pokémon!` : "";
};

const updateEarliestCaughtInfo = () => {
    let earliestTimestamp = Infinity;
    let earliestPokemonName = null;
    let found = false;

    for (const id in pokedexStatus) {
        const pokemon = pokedexStatus[id];
        if (pokemon.caught && pokemon.timestamp) {
            const currentTimestamp = new Date(pokemon.timestamp).getTime();
            if (currentTimestamp < earliestTimestamp) {
                earliestTimestamp = currentTimestamp;
                earliestPokemonName = pokemon.name;
                found = true;
            }
        }
    }

    const activeProfileName = getActiveProfileName();
    if (found) {
        const journeyStartDate = new Date(earliestTimestamp);
        const currentDate = new Date();
        const formattedDate = journeyStartDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });

        const diffTime = currentDate.getTime() - earliestTimestamp;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let durationMessage = "";
        if (diffDays === 0) {
            durationMessage = "It's the very beginning of your adventure!";
        } else if (diffDays < 365) {
            durationMessage = `Your adventure has spanned ${diffDays} day${diffDays !== 1 ? 's' : ''}.`;
        } else {
            const years = Math.floor(diffDays / 365);
            const remainingDays = diffDays % 365;
            durationMessage = `Your adventure has spanned ${years} year${years !== 1 ? 's' : ''}`;
            if (remainingDays > 0) {
                durationMessage += ` and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
            }
            durationMessage += ".";
        }
        earliestCaughtInfoElement.textContent = `${activeProfileName} - You began your journey with ${earliestPokemonName} on ${formattedDate}. ${durationMessage}`;
    } else {
        earliestCaughtInfoElement.textContent = `Welcome, ${activeProfileName}! Your Pokémon journey begins today — which partner will you choose?`;
    }
};

const filterLocationPokemon = (listContainer, searchTerm) => {
    const pokemonEntries = listContainer.querySelectorAll('.location-pokemon-entry');
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    pokemonEntries.forEach(entry => {
        const pokemonName = entry.dataset.pokemonName.toLowerCase();
        const pokemonId = entry.dataset.pokemonId;
        const searchNum = parseInt(lowerCaseSearchTerm, 10);
        let matches = false;

        if (!isNaN(searchNum)) {
            if (parseInt(pokemonId, 10) === searchNum || String(pokemonId).padStart(3, '0') === lowerCaseSearchTerm) {
                matches = true;
            }
        }
        if (!matches) {
            matches = pokemonName.includes(lowerCaseSearchTerm);
        }
        entry.style.display = matches ? 'grid' : 'none';
    });
};

const applyHighlighting = (element, type, value) => {
    element.style.fontWeight = 'bold';
    element.style.borderRadius = '4px';
    element.style.padding = '2px 4px';

    if (type === 'turns' && value === 1) {
        element.style.backgroundColor = '#cfe2ff';
        element.style.color = '#055160';
    } else if (type === 'probability' && value === 100) {
        element.style.backgroundColor = '#d4edda';
        element.style.color = '#155724';
    }
};

const appendCatchProbabilities = (entry, pokemonCatchData, useCheapestMethod, encounterTypes, displayProbabilities) => {
    if (!displayProbabilities) {
        return;
    }

    const probContainer = document.createElement('div');
    probContainer.className = 'probabilities-container';

    const dataToDisplay = useCheapestMethod ? pokemonCatchData.top4CostEfficientBalls : pokemonCatchData.fastestCatchEstimates;

    const { period: currentTimeOfDay } = getCurrentIngameTime();

    dataToDisplay.forEach(item => {
        if (item.ballName === 'Dusk Ball' && !(currentTimeOfDay === 'Night' || encounterTypes.includes('Cave'))) {
            return;
        }

        const singleEstimateBlock = document.createElement('div');
        singleEstimateBlock.className = 'single-ball-probability-block';

        const ballTypeElement = document.createElement('p');
        ballTypeElement.className = 'ball-type';
        ballTypeElement.textContent = item.ballName;
        singleEstimateBlock.appendChild(ballTypeElement);

        const conditionElement = document.createElement('p');
        conditionElement.className = 'probability-info';
        conditionElement.textContent = `Cond: ${item.condition}`;
        singleEstimateBlock.appendChild(conditionElement);

        if (!useCheapestMethod) {
            const turnsElement = document.createElement('p');
            turnsElement.className = 'probability-info';
            turnsElement.textContent = `Turns: ${item.turns}`;
            applyHighlighting(turnsElement, 'turns', item.turns);
            singleEstimateBlock.appendChild(turnsElement);
        }

        const probElement = document.createElement('p');
        probElement.className = 'probability-info';
        probElement.textContent = `Prob: ${item.probability !== null ? item.probability.toFixed(2) + '%' : 'N/A'}`;
        applyHighlighting(probElement, 'probability', item.probability);
        singleEstimateBlock.appendChild(probElement);

        const costOrPriceElement = document.createElement('p');
        costOrPriceElement.className = 'probability-info';
        if (useCheapestMethod) {
            costOrPriceElement.textContent = `Cost: $${item.expectedCost !== null ? item.expectedCost.toFixed(2) : 'N/A'} (Price: $${item.price})`;
        } else {
            costOrPriceElement.textContent = `Cost: $${item.expectedCost !== null ? item.expectedCost.toFixed(2) : 'N/A'}`;
        }
        singleEstimateBlock.appendChild(costOrPriceElement);

        probContainer.appendChild(singleEstimateBlock);
    });
    entry.appendChild(probContainer);
};

const hasBetterEncounterSpot = (pokemonId, currentRarity) => {
    const pokemonObj = POKEMON.find(p => p.id === pokemonId);
    if (!pokemonObj || !pokemonObj.locations) {
        return false;
    }

    if (currentRarity === "Lure") {
        return pokemonObj.locations.some(loc =>
            loc.rarity && loc.rarity !== "Special" && loc.rarity !== "Lure"
        );
    }

    if (currentRarity === "Very Rare") {
        return pokemonObj.locations.some(loc =>
            loc.rarity && loc.rarity !== "Special" && loc.rarity !== "Lure" && loc.rarity !== "Very Rare"
        );
    }

    return false;
};

const createLocationPokemonEntry = (p, useCheapestMethod) => {
    const entry = document.createElement('div');
    entry.className = 'location-pokemon-entry';
    entry.dataset.id = p.id;
    entry.dataset.pokemonId = p.id;
    entry.dataset.pokemonName = p.name;


    const sprite = document.createElement("img");
    sprite.className = "pokemon-sprite small";
    sprite.classList.add(pokedexStatus[p.id]?.caught ? "caught" : "not-caught");
    sprite.setAttribute('title', p.name);
    sprite.dataset.id = p.id;
    loadPokemonSprite(sprite, p);

    const detailsAndAttributesContainer = document.createElement('div');
    detailsAndAttributesContainer.className = 'details-attributes-container';

    const pokemonDetailsDiv = document.createElement('div');
    pokemonDetailsDiv.className = 'pokemon-details';

    const pokemonIdSmall = document.createElement('div');
    pokemonIdSmall.className = 'pokemon-id-small';
    pokemonIdSmall.textContent = String(p.id).padStart(3, '0');

    const name = document.createElement('div');
    name.textContent = p.name;
    name.style.color = getRarityColor(p.encounters);
    pokemonDetailsDiv.appendChild(pokemonIdSmall);
    pokemonDetailsDiv.appendChild(name);

    const evolutionMessages = getEvolutionMessages(p.id);
    evolutionMessages.forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.className = `uncatchable-evolution-message ${msg.type}-message`;
        messageElement.innerHTML = msg.text;
        pokemonDetailsDiv.appendChild(messageElement);
    });

    detailsAndAttributesContainer.appendChild(pokemonDetailsDiv);

    const rarities = [...new Set(p.encounters.map(e => e.rarity))];
    const types = [...new Set(p.encounters.map(e => e.type))].join(', ');
    const levels = [...new Set(p.encounters.map(e => `${e.min_level}-${e.max_level}`))].join(', ');

    const betterSpotMessages = [];
    const isOnlyLureOrVeryRare = rarities.every(r => r === "Lure" || r === "Very Rare") && (rarities.includes("Lure") || rarities.includes("Very Rare"));

    if (isOnlyLureOrVeryRare) {
        rarities.forEach(rarity => {
            if ((rarity === "Lure" || rarity === "Very Rare") && hasBetterEncounterSpot(p.id, rarity)) {
                betterSpotMessages.push(`Note: A better encounter spot exists for ${p.name}.`);
            }
        });
    }

    [...new Set(betterSpotMessages)].forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.className = 'uncatchable-evolution-message better-spot-message';
        messageElement.textContent = msg;
        pokemonDetailsDiv.appendChild(messageElement);
    });

    const attributes = [
        `Rarity: ${rarities.join(', ')}`,
        `Type: ${types}`,
        `Level: ${levels}`
    ];
    attributes.forEach(attrText => {
        const div = document.createElement('div');
        div.className = 'pokemon-attribute-block';
        div.textContent = attrText;
        detailsAndAttributesContainer.appendChild(div);
    });

    entry.appendChild(sprite);
    entry.appendChild(detailsAndAttributesContainer);

    const pokemonCatchData = (useCheapestMethod ? getTop4CostEfficientBalls : getFastestCatchEstimates)(getBestCatchingProbabilities(p.encounters.map(enc => ({ ...p, encounter: enc }))))[0];
    if (pokemonCatchData) {
    const displayProbabilities = !displayProbabilitiesSwitch.checked;
        appendCatchProbabilities(entry, pokemonCatchData, useCheapestMethod, types, displayProbabilities);
    }

    return entry;
};

const groupPokemonByLocation = () => {
    const locations = new Map();
    const selectedRegions = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova'];
    const shouldDisplayMoreInfo = !displayMoreInfoSwitch.checked;

    POKEMON.forEach(pokemon => {
        if (pokemon.locations) {
            // Use the filterLocationsByTimeAndSeason function
            const filteredLocations = filterLocationsByTimeAndSeason(pokemon.locations, selectedRegions);
            
            filteredLocations.forEach(loc => {
                if (loc.rarity === "Special") return;

                // Clean the location name for grouping, removing time/season specifics
                const cleanLocationName = loc.location.replace(/\s*\((season[0-3]|day|night|morning)[^)]*\)/gi, '').trim();
                const locationKey = `${loc.region_name} - ${cleanLocationName}`;

                if (!locations.has(locationKey)) {
                    locations.set(locationKey, { 
                        pokemonMap: new Map(), 
                        uncaughtTriggerCounts: {}, 
                        uncaughtTypeCounts: {},
                        countedUncaughtPokemonForRarity: new Map(), 
                        countedUncaughtPokemonForType: new Map() 
                    });
                }
                const locationData = locations.get(locationKey);
                const pokemonInLocationMap = locationData.pokemonMap;

                if (!pokemonInLocationMap.has(pokemon.id)) {
                    pokemonInLocationMap.set(pokemon.id, { ...pokemon, encounters: [] });
                }
                pokemonInLocationMap.get(pokemon.id).encounters.push(loc);

                if (shouldDisplayMoreInfo && !pokedexStatus[pokemon.id]?.caught) {
                    if (!locationData.countedUncaughtPokemonForRarity.has(loc.rarity)) {
                        locationData.countedUncaughtPokemonForRarity.set(loc.rarity, new Set());
                    }
                    if (!locationData.countedUncaughtPokemonForRarity.get(loc.rarity).has(pokemon.id)) {
                        locationData.uncaughtTriggerCounts[loc.rarity] = (locationData.uncaughtTriggerCounts[loc.rarity] || 0) + 1;
                        locationData.countedUncaughtPokemonForRarity.get(loc.rarity).add(pokemon.id);
                    }

                    if (ENCOUNTER_TYPE.includes(loc.type)) {
                        if (!locationData.countedUncaughtPokemonForType.has(loc.type)) {
                            locationData.countedUncaughtPokemonForType.set(loc.type, new Set());
                        }
                        if (!locationData.countedUncaughtPokemonForType.get(loc.type).has(pokemon.id)) {
                            locationData.uncaughtTypeCounts[loc.type] = (locationData.uncaughtTypeCounts[loc.type] || 0) + 1;
                            locationData.countedUncaughtPokemonForType.get(loc.type).add(pokemon.id);
                        }
                    }
                }
            });
        }
    });
    return locations;
};

const sortLocationPokemon = (pokemonList, currentRegionFilter) => {
    return [...pokemonList].sort((a, b) => {
        const aTypeIndex = ENCOUNTER_TYPE.indexOf(a.encounters[0].type);
        const bTypeIndex = ENCOUNTER_TYPE.indexOf(b.encounters[0].type);

        if (aTypeIndex !== bTypeIndex) {
            return aTypeIndex - bTypeIndex;
        }

        const aRegionalId = getPokeDexID(a.id, currentRegionFilter);
        const bRegionalId = getPokeDexID(b.id, currentRegionFilter);
        const aSortValue = (aRegionalId !== undefined && aRegionalId !== 0) ? aRegionalId : 1000000 + a.id;
        const bSortValue = (bRegionalId !== undefined && bRegionalId !== 0) ? bRegionalId : 1000000 + b.id;
        return aSortValue - bSortValue;
    });
};

const findBestCatchingSpots = () => {
    const savedScrollTop = bestCatchingSpotsContainer.scrollTop;
    const openDetails = Array.from(bestCatchingSpotsContainer.querySelectorAll('details'))
        .filter(d => d.open)
        .map(d => d.querySelector('.location-header')?.textContent?.split('(')[0].trim());

    const locations = groupPokemonByLocation();
    const currentRegionFilter = filterRegionElement.value;
    const uncaughtPokemonIds = new Set(Object.values(pokedexStatus).filter(p => !p.caught).map(p => p.id));

    const selectedRegions = Array.from(regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);

    const relevantLocations = [];
    locations.forEach((locationData, locationKey) => {
        const pokemonMap = locationData.pokemonMap;
        const uncaughtHere = Array.from(pokemonMap.values()).filter(p => uncaughtPokemonIds.has(p.id));

        const locationRegion = locationKey.split(' - ')[0].toLowerCase();
        if (selectedRegions.length === 0 || selectedRegions.includes(locationRegion)) {
            if (uncaughtHere.length > 0) {
                const uniqueUncaughtCount = new Set(uncaughtHere.map(p => p.id)).size;
                relevantLocations.push({
                    locationKey: locationKey,
                    pokemonList: uncaughtHere,
                    uniqueUncaughtCount: uniqueUncaughtCount,
                    uncaughtTriggerCounts: locationData.uncaughtTriggerCounts || {},
                    uncaughtTypeCounts: locationData.uncaughtTypeCounts || {}
                });
            }
        }
    });

    relevantLocations.sort((a, b) => b.uniqueUncaughtCount - a.uniqueUncaughtCount);
    bestCatchingSpotsContainer.innerHTML = "";
    const useCheapestMethod = catchingMethodSwitch.checked;
    const displayProbabilities = !displayProbabilitiesSwitch.checked;

    relevantLocations.forEach((locationDataEntry, index) => {
        const { locationKey, pokemonList, uniqueUncaughtCount } = locationDataEntry;
        const uncaughtTriggerCounts = locationDataEntry.uncaughtTriggerCounts || {};
        const uncaughtTypeCounts = locationDataEntry.uncaughtTypeCounts || {};

        const details = document.createElement("details");
        if (openDetails.includes(locationKey)) {
            details.open = true;
        }

        const summary = document.createElement("summary");
        summary.className = "location-header";
        summary.textContent = `${locationKey} (${uniqueUncaughtCount} uncaught Pokémon)`;
        details.appendChild(summary);

        if (!displayMoreInfoSwitch.checked) {
            const countsContainer = document.createElement("div");
            countsContainer.className = "location-counts-container";

            const triggersDiv = document.createElement("div");
            triggersDiv.className = "location-triggers-counts";
            triggersDiv.textContent = "Rarities: ";
            const sortedTriggers = Object.keys(uncaughtTriggerCounts).sort((a, b) => {
                const orderA = ENCOUNTER_TRIGGERS.find(t => t.name === a)?.order || Infinity;
                const orderB = ENCOUNTER_TRIGGERS.find(t => t.name === b)?.order || Infinity;
                return orderA - orderB;
            });
            triggersDiv.innerHTML += sortedTriggers.map(trigger => {
                const triggerColor = ENCOUNTER_TRIGGERS.find(t => t.name === trigger)?.color || '#FFFFFF';
                return `<span style="color: ${triggerColor};">${trigger}</span> (${uncaughtTriggerCounts[trigger]})`;
            }).join(', ');
            countsContainer.appendChild(triggersDiv);

            const typesDiv = document.createElement("div");
            typesDiv.className = "location-types-counts";
            typesDiv.textContent = "Types: ";
            const sortedTypes = Object.keys(uncaughtTypeCounts).sort((a, b) => ENCOUNTER_TYPE.indexOf(a) - ENCOUNTER_TYPE.indexOf(b));
            typesDiv.innerHTML += sortedTypes.map(type => `${type} (${uncaughtTypeCounts[type]})`).join(', ');
            countsContainer.appendChild(typesDiv);

            details.appendChild(countsContainer);
        }

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter Pokémon...';
        searchInput.className = 'location-search-input';
        details.appendChild(searchInput);

        const listContainer = document.createElement("div");
        listContainer.className = "location-pokemon-list";
        details.appendChild(listContainer);

        searchInput.addEventListener('input', () => filterLocationPokemon(listContainer, searchInput.value));
        
        const sortedLocationPokemon = sortLocationPokemon(pokemonList, currentRegionFilter);
        sortedLocationPokemon.forEach(p => {
            listContainer.appendChild(createLocationPokemonEntry(p, useCheapestMethod, displayProbabilities));
        });
        bestCatchingSpotsContainer.appendChild(details);
    });
    bestCatchingSpotsContainer.scrollTop = savedScrollTop;
};

const handleBestSpotsSpriteClick = (e) => {
    const clickedSprite = e.target.closest('.location-pokemon-entry .pokemon-sprite');
    if (!clickedSprite) return;

    const pokemonId = clickedSprite.dataset.id;
    if (!pokemonId) return;

    const wasCaughtBeforeClick = pokedexStatus[pokemonId].caught;
    pokedexStatus[pokemonId].caught = !wasCaughtBeforeClick;

    if (pokedexStatus[pokemonId].caught) {
        pokedexStatus[pokemonId].timestamp = new Date().toISOString();
    } else {
        pokedexStatus[pokemonId].timestamp = null;
    }

    saveProfileData('pokedexStatus', pokedexStatus);
    clickedSprite.classList.toggle('caught');
    clickedSprite.classList.toggle('not-caught');

    document.querySelectorAll(`.location-pokemon-entry .pokemon-sprite[data-id="${pokemonId}"]`).forEach(sprite => {
        if (pokedexStatus[pokemonId].caught) {
            sprite.classList.add('caught');
            sprite.classList.remove('not-caught');
        } else {
            sprite.classList.add('not-caught');
            sprite.classList.remove('caught');
        }
    });

    displayPokemon();

    setTimeout(() => {
        findBestCatchingSpots();
    }, 300);
};

const populateFilters = () => {
    if (filterRegionElement.options.length <= 1) {
        REGIONS.forEach((region) => {
            const option = document.createElement("option");
            option.value = region;
            option.textContent = region.charAt(0).toUpperCase() + region.slice(1);
            filterRegionElement.appendChild(option);
        });
    }

    while (filterEncounterTriggerElement.options.length > 1) {
        filterEncounterTriggerElement.remove(1);
    }
    const specialOnlyOption = document.createElement("option");
    specialOnlyOption.value = "Special Only";
    specialOnlyOption.textContent = "Special Only";
    filterEncounterTriggerElement.appendChild(specialOnlyOption);

    ENCOUNTER_TRIGGERS.forEach((trigger) => {
        const option = document.createElement("option");
        option.value = trigger.name;
        option.textContent = trigger.name;
        filterEncounterTriggerElement.appendChild(option);
    });

    while (filterEncounterTypeElement.options.length > 1) {
        filterEncounterTypeElement.remove(1);
    }
    ENCOUNTER_TYPE.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        filterEncounterTypeElement.appendChild(option);
    });

    if (regionCheckboxesContainer.children.length <= 1) {
        REGIONS.forEach(region => {
            const checkboxId = `region-${region}`;
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'region-checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.name = 'filterRegionCheckbox';
            checkbox.value = region;
            checkbox.checked = true;

            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = region.charAt(0).toUpperCase() + region.slice(1);

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            regionCheckboxesContainer.appendChild(checkboxDiv);
        });
    }
};

const setupEventListeners = () => {
    if (pokedexGrid.dataset.listenersInitialized) return;

    pokedexGrid.addEventListener("click", (e) => {
        const entry = e.target.closest(".pokemon-entry");
        if (entry) {
            const pokemonId = entry.dataset.id;
            const isCaught = pokedexStatus[pokemonId].caught;
            pokedexStatus[pokemonId].caught = !isCaught;

            if (pokedexStatus[pokemonId].caught) {
                pokedexStatus[pokemonId].timestamp = new Date().toISOString();
            } else {
                pokedexStatus[pokemonId].timestamp = null;
            }
            saveProfileData('pokedexStatus', pokedexStatus);
            displayPokemon();
        }
    });

    bestCatchingSpotsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.location-search-input')) {
            e.stopPropagation();
            return;
        }
        handleBestSpotsSpriteClick(e);
    });

    catchingSpotSearchInput.addEventListener('input', () => {
        const searchTerm = catchingSpotSearchInput.value.toLowerCase();
        const locationDetails = bestCatchingSpotsContainer.querySelectorAll('details');
        locationDetails.forEach(detail => {
            const locationHeader = detail.querySelector('.location-header').textContent.toLowerCase();
            if (locationHeader.includes(searchTerm)) {
                detail.style.display = '';
            } else {
                detail.style.display = 'none';
            }
        });
    });

    togglePokedexBtn.addEventListener("click", () => {
        const container = document.querySelector(".pokedex-grid-container");
        container.style.display = container.style.display === "none" ? "block" : "none";
    });

    findBestCatchingSpotsBtn.addEventListener('click', findBestCatchingSpots);

    exportPokedexBtn.addEventListener("click", () => exportPokedexData(pokedexStatus));

    importPokedexBtn.addEventListener("click", async () => {
        try {
            const importedData = await importPokedexData();
            Object.keys(importedData).forEach(id => {
                if (importedData[id].timestamp === undefined) {
                    importedData[id].timestamp = importedData[id].caught ? new Date().toISOString() : null;
                }
            });
            pokedexStatus = importedData;
            saveProfileData('pokedexStatus', pokedexStatus);
            displayPokemon();
            displayMessageBox("Pokédex data imported successfully!", "success");
        } catch (error) {
            console.error("Error importing Pokedex data:", error.message);
            displayMessageBox(`Error importing Pokédex data: ${error.message}`, "error");
        }
    });

    const filters = [
        searchInputElement, filterRegionElement, filterEncounterTriggerElement,
        filterEncounterTypeElement, filterCaughtElement, filterCanBeCaughtElement,
        filterCaughtDateElement, sortCaughtDateElement
    ];
    filters.forEach(element => {
        const eventType = (element.id === 'search' || element.id === 'filterCaughtDate') ? 'input' : 'change';
        element.addEventListener(eventType, displayPokemon);
    });

    catchingMethodSwitch.addEventListener('change', () => {
        localStorage.setItem('catchingMethod', catchingMethodSwitch.checked);
    });

    displayProbabilitiesSwitch.addEventListener('change', () => {
        localStorage.setItem('displayProbabilities', displayProbabilitiesSwitch.checked);
    });
    displayMoreInfoSwitch.addEventListener('change', () => {
        localStorage.setItem('displayMoreInfo', displayMoreInfoSwitch.checked);
    });
    
    pokedexGrid.dataset.listenersInitialized = 'true';
};

let lastKnownIngamePeriod = localStorage.getItem('lastKnownIngamePeriod');

const checkIngameTimeChange = () => {
    const { period: currentIngamePeriod } = getCurrentIngameTime();
    if (lastKnownIngamePeriod && lastKnownIngamePeriod !== currentIngamePeriod) {
        createMessageBox('info', 'The in-game daytime has changed. Refreshing the best catching spots list...');
        findBestCatchingSpots();
    }
    localStorage.setItem('lastKnownIngamePeriod', currentIngamePeriod);
    lastKnownIngamePeriod = currentIngamePeriod;
};

async function initializeApp() {
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

        populateFilters();
        setupEventListeners();
        displayPokemon();
        setInterval(checkIngameTimeChange, 30 * 1000);
    } catch (error) {
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-size: 1.2em; color: red;">
            <h1>Application Error</h1>
            <p>Could not load essential Pokémon data. Please check the console for details.</p>
            <p><em>${error.message}</em></p>
        </div>`;
        console.error("Pokedex Helper initialization failed:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initHamburgerMenu(initializeApp);
});
