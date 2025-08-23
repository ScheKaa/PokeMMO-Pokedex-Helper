import { loadPokemonData, POKEMON, getPokeDexID } from '../../utils/pokemon.js';
import {
    REGIONS,
    ENCOUNTER_TRIGGERS,
    ENCOUNTER_TYPE,
} from "../../utils/location.js";
import { exportPokedexData, importPokedexData } from "../../utils/import-export.js";
import { getBestCatchingProbabilities, getTop4CostEfficientBalls, getFastestCatchEstimates } from "../../utils/bestCatcher.js";
import { getCurrentIngameTime, getRarityColor, getCurrentSeason, getSeasonName, getTimeUntilNextPeriod, getEvolutionLine, getUncaughtEvolutionLineCount, getEvolutionLineDetails } from '../../utils/dex-helper-utils.js';
import { getEvolutionMessages, getPokemonNotes } from '../../utils/note-helper.js';
import { processChatLog, confirmAndAddCaughtPokemon } from '../../utils/chat-log-parser.js';
import { initHamburgerMenu } from './hamburger-menu.js';
import { getProfileData, saveProfileData, getActiveProfileName } from '../../utils/profile-manager.js';
import { displayMessageBox, createMessageBox } from '../../utils/ui-helper.js';
import { getFilteredPokemon, getSortedPokemon, isPokemonTimeExclusiveOnly } from '../../utils/filter-helper.js';
import { hasBetterEncounterSpot, groupPokemonByLocation, sortLocationPokemon, sortRelevantLocations, sortDisplayedCatchingSpots, filterDisplayedCatchingSpots } from '../../utils/sorting-algorithm.js';

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
const filterSpecialElement = document.getElementById("filterSpecialPokemon");
const filterDexStatusElement = document.getElementById("filterDexStatus");
const filterCanBeCaughtElement = document.getElementById("filterCanBeCaught");
const filterCaughtDateElement = document.getElementById("filterCaughtDate");
const sortCaughtDateElement = document.getElementById("sortCaughtDate");
const exportPokedexBtn = document.getElementById("exportPokedexBtn");
const importPokedexBtn = document.getElementById("importPokedexBtn");
const uploadChatLogInput = document.getElementById("uploadChatLogInput");
const uploadChatLogBtn = document.getElementById("uploadChatLogBtn");
const togglePokedexBtn = document.getElementById("togglePokedex");
const findBestCatchingSpotsBtn = document.getElementById("findBestCatchingSpots");
const regionCheckboxesContainer = document.getElementById("regionCheckboxes");
const catchingSpotSearchInput = document.getElementById("catchingSpotSearch");
const pokemonFilterInput = document.getElementById("pokemonFilterInput");
const ingameTimeElement = document.getElementById("ingameTime");
const excludeSafariCheckbox = document.getElementById("excludeSafariCheckbox");
const prioritizeTimeExclusiveCheckbox = document.getElementById("prioritizeTimeExclusiveCheckbox");
const exclusiveRarityEncounterFilteringCheckbox = document.getElementById("exclusiveRarityEncounterFiltering");
const sortCatchingSpotsDropdown = document.getElementById("sortCatchingSpotsDropdown");

let pokedexStatus = {};
const TextHighlightColor = '#9ae6b4';

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


const createPokemonEntry = (p, regionFilter) => {
    const entry = document.createElement("div");
    entry.className = "pokemon-entry";
    entry.dataset.id = p.id;

    const sprite = document.createElement("img");
    sprite.className = "pokemon-sprite";
    sprite.classList.add(pokedexStatus[p.id]?.caught ? "caught" : "not-caught");
    if (pokedexStatus[p.id]?.evolution_note !== null) {
        sprite.classList.add("noted-evolution-line");
    }
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

    const pokemonNote = document.createElement("button");
    pokemonNote.className = "pokemon-note control-button";
    pokemonNote.textContent = "Info";
    pokemonNote.dataset.pokemonId = p.id;

    if (!pokemonNotesCache[p.id] || pokemonNotesCache[p.id].length === 0) {
        pokemonNote.style.display = "none";
    }

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
    entry.appendChild(pokemonNote);
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
    const filterOptions = {
        searchTerm: searchInputElement.value.toLowerCase(),
        regionFilter: filterRegionElement.value,
        triggerFilter: filterEncounterTriggerElement.value,
        typeFilter: filterEncounterTypeElement.value,
        caughtFilter: filterSpecialElement.value,
        dexStatusFilter: filterDexStatusElement.value,
        canBeCaughtFilter: filterCanBeCaughtElement.value,
        caughtDateFilter: filterCaughtDateElement.value,
        exclusiveFilter: exclusiveRarityEncounterFilteringCheckbox.checked
    };
    const filteredPokemon = getFilteredPokemon(filterOptions, pokedexStatus);

    const sortOptions = {
        sortCaughtDate: sortCaughtDateElement.value,
        regionFilter: filterRegionElement.value
    };
    const sortedPokemon = getSortedPokemon(filteredPokemon, sortOptions, pokedexStatus);
    const regionFilter = filterRegionElement.value;

    // Updated line to apply color to the displayed Pokémon count.
    pokemonCountElement.innerHTML = `Displaying <span style="color: ${ TextHighlightColor};">${sortedPokemon.length}</span> of <span style="color: ${ TextHighlightColor};">${POKEMON.length}</span> Pokémon`;
    updateCaughtPokemonCount();
    updateEarliestCaughtInfo();

    sortedPokemon.forEach((p) => {
        pokedexGrid.appendChild(createPokemonEntry(p, regionFilter));
    });
};

const updateCaughtPokemonCount = () => {
    const caughtCount = Object.values(pokedexStatus).filter(p => p.caught).length;
    if (caughtCount) {
        caughtPokemonCountElement.innerHTML = `And so far, you've caught <span style="color: ${ TextHighlightColor};">${caughtCount}</span> Pokémon!`;
    } else {
        caughtPokemonCountElement.textContent = "";
    }
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
            month: 'long',
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
        earliestCaughtInfoElement.innerHTML = `
            <span style="color: ${ TextHighlightColor};">${activeProfileName}</span> - 
            You began your journey with <span style="color: ${ TextHighlightColor};">${earliestPokemonName}</span> on ${formattedDate}. 
        `;
    } else {
        earliestCaughtInfoElement.innerHTML = `
            Welcome, <span style="color: ${ TextHighlightColor};">${activeProfileName}</span>! 
            Your Pokémon journey begins today — which partner will you choose?
        `;
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

const createLocationPokemonEntry = (p, useCheapestMethod) => {
    const entry = document.createElement('div');
    entry.className = 'location-pokemon-entry';
    entry.dataset.id = p.id;
    entry.dataset.pokemonId = p.id;
    entry.dataset.pokemonName = p.name;

    const spriteContainer = document.createElement('div');
    spriteContainer.className = 'pokemon-sprite-container';

    const sprite = document.createElement("img");
    sprite.className = "pokemon-sprite small";
    sprite.classList.add(pokedexStatus[p.id]?.caught ? "caught" : "not-caught");
    if (pokedexStatus[p.id]?.evolution_note !== null) {
        sprite.classList.add("noted-evolution-line");
    }
    sprite.setAttribute('title', p.name);
    sprite.dataset.id = p.id;
    loadPokemonSprite(sprite, p);
    spriteContainer.appendChild(sprite);

    //const evolutionLine = getEvolutionLine(p.id);
    const uncaughtEvolutionCount = getUncaughtEvolutionLineCount(p.id, pokedexStatus);

    const evolutionLineCountElement = document.createElement('p');
    evolutionLineCountElement.className = 'pokemon-time-exclusivity';
    evolutionLineCountElement.textContent = `(+${uncaughtEvolutionCount} Dex)`;
    spriteContainer.appendChild(evolutionLineCountElement);

    if (uncaughtEvolutionCount > 1) {
        const catchAllButton = document.createElement('button');
        catchAllButton.className = 'control-button catch-all-evolution-button';
        catchAllButton.textContent = 'Catch All';
        catchAllButton.dataset.pokemonId = p.id;
        spriteContainer.appendChild(catchAllButton);

        const evoButton = document.createElement('button');
        evoButton.className = 'control-button evo-button';
        evoButton.textContent = 'Evo';
        evoButton.dataset.pokemonId = p.id;
        spriteContainer.appendChild(evoButton);

        const noteLineButton = document.createElement('button');
        noteLineButton.className = 'control-button note-line-evolution-button';
        noteLineButton.textContent = 'Note';
        noteLineButton.dataset.pokemonId = p.id;
        spriteContainer.appendChild(noteLineButton);
    }

    const timeExclusivities = [...new Set(p.encounters.map(e => e.timeExclusivity).filter(Boolean))];

    if (timeExclusivities.length > 0) {
        const timeExclusivityElement = document.createElement('p');
        timeExclusivityElement.className = 'pokemon-time-exclusivity';
        timeExclusivityElement.textContent = `(${timeExclusivities.join('/')})`;

        if (isPokemonTimeExclusiveOnly(p)) {
            timeExclusivityElement.style.color =  TextHighlightColor;
        }
        spriteContainer.appendChild(timeExclusivityElement);
    }

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

    const evolutionMessages = getEvolutionMessages(p.id, pokedexStatus);
    evolutionMessages.forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.className = `uncatchable-evolution-message ${msg.type}-message`;
        messageElement.innerHTML = msg.text;
        pokemonDetailsDiv.appendChild(messageElement);
    });

    if (pokedexStatus[p.id]?.evolution_note !== null) {
        const evolutionNoteMessage = document.createElement('p');
        evolutionNoteMessage.className = 'uncatchable-evolution-message evolution-note-message';
        evolutionNoteMessage.innerHTML = `Info: Evolve your <span class="pokemon-note-name-highlight">${pokedexStatus[p.id].evolution_note}</span>.`;
        pokemonDetailsDiv.appendChild(evolutionNoteMessage);
    }

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

    entry.appendChild(spriteContainer);
    entry.appendChild(detailsAndAttributesContainer);

    const pokemonCatchData = (useCheapestMethod ? getTop4CostEfficientBalls : getFastestCatchEstimates)(getBestCatchingProbabilities(p.encounters.map(enc => ({ ...p, encounter: enc }))))[0];
    if (pokemonCatchData) {
    const displayProbabilities = !displayProbabilitiesSwitch.checked;
        appendCatchProbabilities(entry, pokemonCatchData, useCheapestMethod, types, displayProbabilities);
    }

    return entry;
};

const findBestCatchingSpots = () => {
    const savedScrollTop = bestCatchingSpotsContainer.scrollTop;
    const openDetails = Array.from(bestCatchingSpotsContainer.querySelectorAll('details'))
        .filter(d => d.open)
        .map(d => d.querySelector('.location-header')?.textContent?.split('(')[0].trim());

    const groupConfig = {
        pokedexStatus: pokedexStatus,
        displayMoreInfoChecked: displayMoreInfoSwitch.checked
    };
    const locations = groupPokemonByLocation(groupConfig);
    const currentRegionFilter = filterRegionElement.value;
    // Filter out caught and noted Pokémon for calculation purposes
    const trulyUncaughtPokemonIds = new Set(Object.keys(pokedexStatus).filter(id => !pokedexStatus[id].caught && pokedexStatus[id].evolution_note === null).map(id => parseInt(id, 10)));

    const relevantLocations = [];
    locations.forEach((locationData, locationKey) => {
        const pokemonMap = locationData.pokemonMap;
        // Filter for display: show all uncaught, including noted ones
        const uncaughtHereForDisplay = Array.from(pokemonMap.values()).filter(p => !pokedexStatus[p.id]?.caught);
        // Filter for calculations: only truly uncaught (not caught and not noted)
        const trulyUncaughtHereForCalc = Array.from(pokemonMap.values()).filter(p => trulyUncaughtPokemonIds.has(p.id));

        if (uncaughtHereForDisplay.length > 0) {
            const catchableCount = new Set(trulyUncaughtHereForCalc.map(p => p.id)).size;

            let evolutionLineCount = 0;
            const countedEvolutionLines = new Set();
            const allUncaughtPokemonInRelevantLines = new Set();

            trulyUncaughtHereForCalc.forEach(p => {
                const evolutionLineNames = getEvolutionLine(p.id);
                const evolutionLineKey = evolutionLineNames.sort().join('-');

                if (!countedEvolutionLines.has(evolutionLineKey)) {
                    evolutionLineCount++;
                    countedEvolutionLines.add(evolutionLineKey);

                    evolutionLineNames.forEach(evoName => {
                        const evoPokemon = POKEMON.find(pk => pk.name === evoName);
                        if (evoPokemon && !pokedexStatus[evoPokemon.id]?.caught && pokedexStatus[evoPokemon.id]?.evolution_note === null) {
                            allUncaughtPokemonInRelevantLines.add(evoPokemon.id);
                        }
                    });
                }
            });
            const totalUncaughtInEvolutionLines = allUncaughtPokemonInRelevantLines.size;

            relevantLocations.push({
                locationKey: locationKey,
                pokemonList: uncaughtHereForDisplay,
                evolutionLineCount: evolutionLineCount,
                catchableCount: catchableCount,
                totalUncaughtInEvolutionLines: totalUncaughtInEvolutionLines,
                uncaughtTriggerCounts: locationData.uncaughtTriggerCounts || {},
                uncaughtTypeCounts: locationData.uncaughtTypeCounts || {}
            });
        }
    });

    sortRelevantLocations(relevantLocations);

    bestCatchingSpotsContainer.innerHTML = "";
    const useCheapestMethod = catchingMethodSwitch.checked;
    const displayProbabilities = !displayProbabilitiesSwitch.checked;

    relevantLocations.forEach((locationDataEntry, index) => {
        const { locationKey, pokemonList, evolutionLineCount, catchableCount, totalUncaughtInEvolutionLines } = locationDataEntry;
        const uncaughtTriggerCounts = locationDataEntry.uncaughtTriggerCounts || {};
        const uncaughtTypeCounts = locationDataEntry.uncaughtTypeCounts || {};

        const details = document.createElement("details");
        if (openDetails.includes(locationKey)) {
            details.open = true;
        }

        const summary = document.createElement("summary");
        summary.className = "location-header";
        summary.dataset.locationName = locationKey;

        const locationKeySpan = document.createElement("span");
        locationKeySpan.className = "location-key-text";
        locationKeySpan.textContent = locationKey;
        locationKeySpan.style.color = '#FFD700'; // Explicitly set yellow color
        summary.appendChild(locationKeySpan);

        const summaryTextSpan = document.createElement("span");
        summaryTextSpan.className = "summary-details-text";
        summaryTextSpan.textContent = ` (${evolutionLineCount} Species Lines - ${catchableCount} Catchable Species - ${totalUncaughtInEvolutionLines} Dex Entries)`;
        summary.appendChild(summaryTextSpan);

        const hasTimeExclusivePokemon = pokemonList.some(p => p.encounters.some(e => e.timeExclusivityOnly));
        if (hasTimeExclusivePokemon) {
            summaryTextSpan.style.color = TextHighlightColor;
        }
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
    const filterConfig = {
        bestCatchingSpotsContainer: bestCatchingSpotsContainer,
        locationSearchTerm: catchingSpotSearchInput.value.toLowerCase(),
        pokemonSearchTerm: pokemonFilterInput.value.toLowerCase(),
        selectedRegions: Array.from(regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value.toLowerCase()),
        excludeSafariChecked: excludeSafariCheckbox.checked,
        prioritizeTimeExclusiveChecked: prioritizeTimeExclusiveCheckbox.checked,
        sortingOption: sortCatchingSpotsDropdown.value
    };
    filterDisplayedCatchingSpots(filterConfig);
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
        pokedexStatus[pokemonId].evolution_note = null;
    } else {
        pokedexStatus[pokemonId].timestamp = null;
        pokedexStatus[pokemonId].evolution_note = null;
    }

    saveProfileData('pokedexStatus', pokedexStatus);
    clickedSprite.classList.toggle('caught');
    clickedSprite.classList.toggle('not-caught');
    clickedSprite.classList.remove('noted-evolution-line');

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

    const parentDetails = clickedSprite.closest('details');
    const locationKey = parentDetails?.querySelector('.location-header')?.dataset.locationName;

    setTimeout(() => {
        findBestCatchingSpots();
        if (locationKey) {
            const newDetails = bestCatchingSpotsContainer.querySelector(`details .location-header[data-location-name="${locationKey}"]`)?.closest('details');
            if (newDetails) {
                newDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
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
    ENCOUNTER_TRIGGERS.forEach((trigger) => {
        const option = document.createElement("option");
        option.value = trigger.name;
        option.textContent = trigger.name;
        option.style.color = trigger.color;
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

    pokedexGrid.addEventListener("click", async (e) => {
        const entry = e.target.closest(".pokemon-entry");
        if (!entry) return;

        const pokemonId = entry.dataset.id;
        if (!pokemonId) return;

        if (e.target.classList.contains("pokemon-note")) {
            const sprite = entry.querySelector(".pokemon-sprite");
            await showPokemonNotesPopup(pokemonId, sprite);
        } else {
            // Left-click behavior: toggle caught status and clear note
            const isCaught = pokedexStatus[pokemonId].caught;
            pokedexStatus[pokemonId].caught = !isCaught;

            if (pokedexStatus[pokemonId].caught) {
                pokedexStatus[pokemonId].timestamp = new Date().toISOString();
                pokedexStatus[pokemonId].evolution_note = null; // Clear note when caught
            } else {
                pokedexStatus[pokemonId].timestamp = null;
                pokedexStatus[pokemonId].evolution_note = null; // Clear note when uncaught
            }
            saveProfileData('pokedexStatus', pokedexStatus);
            await updateEvolutionNotesInCache(pokemonId);
            displayPokemon(); 
        }
    });

    pokedexGrid.addEventListener("contextmenu", async (e) => {
        const entry = e.target.closest(".pokemon-entry");
        if (!entry) return;

        const pokemonId = entry.dataset.id;
        if (!pokemonId) return;

        e.preventDefault();

        // Right-click behavior: mark as uncaught and remove note
        pokedexStatus[pokemonId].caught = false;
        pokedexStatus[pokemonId].timestamp = null;
        pokedexStatus[pokemonId].evolution_note = null;

        saveProfileData('pokedexStatus', pokedexStatus);
        await updateEvolutionNotesInCache(pokemonId);
        displayPokemon();
    });

    bestCatchingSpotsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.location-search-input')) {
            e.stopPropagation();
            return;
        }

        const catchAllButton = e.target.closest('.catch-all-evolution-button');
        if (catchAllButton) {
            const pokemonId = parseInt(catchAllButton.dataset.pokemonId);
            const evolutionLineNames = getEvolutionLine(pokemonId);
            const uncaughtEvolutionPokemon = evolutionLineNames.map(name => POKEMON.find(p => p.name === name)).filter(p => p && !pokedexStatus[p.id]?.caught);

            if (uncaughtEvolutionPokemon.length > 0) {
                const pokemonNamesToCatch = uncaughtEvolutionPokemon.map(p => `<span style="color: #FFD700;">${p.name}</span>`).join(', ');
                const message = `The Pokémon; ${pokemonNamesToCatch}, will be marked as caught!`;
                createMessageBox("info", "WARNING", `${message}`, true, async () => {
                    const now = new Date().toISOString();
                    uncaughtEvolutionPokemon.forEach(p => {
                        pokedexStatus[p.id] = { id: p.id, name: p.name, caught: true, timestamp: now };
                    });
                    saveProfileData('pokedexStatus', pokedexStatus);
                    await updateEvolutionNotesInCache(pokemonId);
                    displayPokemon();
                    findBestCatchingSpots();
                });
            } else {
                createMessageBox("info", "INFO", "All Pokémon in this evolution line are already caught!", false);
            }
            return;
        }

        const evoButton = e.target.closest('.evo-button');
        if (evoButton) {
            const pokemonId = parseInt(evoButton.dataset.pokemonId);
            const evolutionLine = getEvolutionLineDetails(pokemonId);

            // Sort by order to display correctly
            evolutionLine.sort((a, b) => a.order - b.order);

            let message = `Evolution Line for <span style="color: #FFD700;">${POKEMON.find(p => p.id === pokemonId)?.name}</span>:<br><br>`;
            const evolutionsByOrder = new Map();

            evolutionLine.forEach(evo => {
                if (!evolutionsByOrder.has(evo.order)) {
                    evolutionsByOrder.set(evo.order, []);
                }
                evolutionsByOrder.get(evo.order).push(evo);
            });

            // Sort orders numerically
            const sortedOrders = Array.from(evolutionsByOrder.keys()).sort((a, b) => a - b);

            sortedOrders.forEach(order => {
                const pokemonAtOrder = evolutionsByOrder.get(order);
                const pokemonNames = pokemonAtOrder.map(p => `<span style="color: #FFD700;">${p.name}</span>`).join(', ');
                message += `${pokemonNames} (Order: ${order})`;

                pokemonAtOrder.forEach(evo => {
                    if (evo.evolutions && evo.evolutions.length > 0) {
                        evo.evolutions.forEach(nextEvo => {
                            let evolutionMethod = '';
                            if (nextEvo.type) {
                                evolutionMethod += `Type: ${nextEvo.type}`;
                                if (nextEvo.item_name) {
                                    evolutionMethod += `, Item: ${nextEvo.item_name}`;
                                }
                                if (nextEvo.type === 'LEVEL' && nextEvo.val) {
                                    evolutionMethod += `, Level: ${nextEvo.val}`;
                                }
                            }
                            if (evolutionMethod) {
                                message += `<br>&nbsp;&nbsp;&nbsp;&nbsp;→ <span style="color: #9ae6b4;">${nextEvo.name}</span> (${evolutionMethod})`;
                            } else {
                                message += `<br>&nbsp;&nbsp;&nbsp;&nbsp;→ <span style="color: #9ae6b4;">${nextEvo.name}</span>`;
                            }
                        });
                    }
                });
                message += `<br>`;
            });

            createMessageBox("info", "Evolution Line", message, false, null, true);
            return;
        }

        const noteLineButton = e.target.closest('.note-line-evolution-button');
        if (noteLineButton) {
            const pokemonId = parseInt(noteLineButton.dataset.pokemonId);
            const clickedPokemon = POKEMON.find(p => p.id === pokemonId);
            const evolutionLineNames = getEvolutionLine(pokemonId);
            const evolutionLinePokemon = evolutionLineNames.map(name => POKEMON.find(p => p.name === name)).filter(Boolean);

            // Filter to only include uncaught Pokémon for noting
            const uncaughtPokemonToNote = evolutionLinePokemon.filter(p => p.id !== pokemonId && !pokedexStatus[p.id]?.caught);
            const pokemonNamesToNote = uncaughtPokemonToNote.map(p => `<span style="color: #FFD700;">${p.name}</span>`).join(', ');

            let message;
            if (uncaughtPokemonToNote.length > 0) {
                message = `You're marking Pokémon <span style="color: #FFD700;">${clickedPokemon.name}</span> as caught and adding a note for uncaught Pokémon: ${pokemonNamesToNote}. Caught Pokémon will still appear in lists but won't be included in calculations. Right-click to uncatch, left-click to catch.`;
            } else {
                message = `Mark Pokémon <span style="color: #FFD700;">${clickedPokemon.name}</span> as Caught. All other Pokémon in its evolution line are already caught.`;
            }
            
            createMessageBox("info", "WARNING", message, true, async () => {
                const now = new Date().toISOString();

                // Mark the clicked Pokémon as caught and clear its evolution_note
                pokedexStatus[pokemonId] = { ...pokedexStatus[pokemonId], caught: true, timestamp: now, evolution_note: null };
                uncaughtPokemonToNote.forEach(p => {
                    pokedexStatus[p.id] = { ...pokedexStatus[p.id], evolution_note: clickedPokemon.name };
                });

                saveProfileData('pokedexStatus', pokedexStatus);
                await updateEvolutionNotesInCache(pokemonId);
                displayPokemon();
                findBestCatchingSpots();
            });
            return;
        }

        handleBestSpotsSpriteClick(e);
    });

    catchingSpotSearchInput.addEventListener('input', () => {
        const filterConfig = {
            bestCatchingSpotsContainer: bestCatchingSpotsContainer,
            locationSearchTerm: catchingSpotSearchInput.value.toLowerCase(),
            pokemonSearchTerm: pokemonFilterInput.value.toLowerCase(),
            selectedRegions: Array.from(regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value.toLowerCase()),
            excludeSafariChecked: excludeSafariCheckbox.checked,
            prioritizeTimeExclusiveChecked: prioritizeTimeExclusiveCheckbox.checked
        };
        filterDisplayedCatchingSpots(filterConfig);
    });
    pokemonFilterInput.addEventListener('input', () => {
        const filterConfig = {
            bestCatchingSpotsContainer: bestCatchingSpotsContainer,
            locationSearchTerm: catchingSpotSearchInput.value.toLowerCase(),
            pokemonSearchTerm: pokemonFilterInput.value.toLowerCase(),
            selectedRegions: Array.from(regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value.toLowerCase()),
            excludeSafariChecked: excludeSafariCheckbox.checked,
            prioritizeTimeExclusiveChecked: prioritizeTimeExclusiveCheckbox.checked
        };
        filterDisplayedCatchingSpots(filterConfig);
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
            pokedexStatus = updatePokedexStatus(importedData);
            saveProfileData('pokedexStatus', pokedexStatus);
            displayPokemon();
            displayMessageBox("Pokédex data imported successfully!", "success");
        } catch (error) {
            console.error("Error importing Pokedex data:", error.message);
            displayMessageBox(`Error importing Pokédex data: ${error.message}`, "error");
        }
    });

    uploadChatLogBtn.addEventListener("click", () => {
        uploadChatLogInput.click();
    });

    uploadChatLogInput.addEventListener("change", async (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            let totalNewCaughtPokemon = [];
            for (const file of files) {
                try {
                    const fileContent = await file.text();
                    const newCaughtPokemon = await processChatLog(fileContent);
                    totalNewCaughtPokemon = totalNewCaughtPokemon.concat(newCaughtPokemon);
                } catch (error) {
                    console.error(`Error processing chat log file ${file.name}:`, error);
                    displayMessageBox(`Error processing chat log file ${file.name}: ${error.message}`, "error");
                }
            }
            if (totalNewCaughtPokemon.length > 0) {
                await confirmAndAddCaughtPokemon(totalNewCaughtPokemon, pokedexStatus, saveProfileData, displayPokemon);
            } else {
                displayMessageBox("No new caught Pokémon found in the selected chat logs for your profile.", "info");
            }
            event.target.value = ''; 
        }
    });

    const filters = [
        searchInputElement, filterRegionElement, filterEncounterTriggerElement,
        filterEncounterTypeElement, filterSpecialElement, filterDexStatusElement, filterCanBeCaughtElement,
        filterCaughtDateElement, sortCaughtDateElement
    ];
    filterDexStatusElement.addEventListener('change', displayPokemon);
    filters.forEach(element => {
        const eventType = (element.id === 'search' || element.id === 'filterCaughtDate') ? 'input' : 'change';
        element.addEventListener(eventType, displayPokemon);
    });

    filterSpecialElement.addEventListener('change', () => {
        applySelectedOptionColor(filterSpecialElement);
        displayPokemon();
    });
    filterDexStatusElement.addEventListener('change', () => {
        applySelectedOptionColor(filterDexStatusElement);
        displayPokemon();
    });
    filterCanBeCaughtElement.addEventListener('change', () => {
        applySelectedOptionColor(filterCanBeCaughtElement);
        displayPokemon();
    });
    filterEncounterTriggerElement.addEventListener('change', () => {
        applySelectedOptionColor(filterEncounterTriggerElement);
        displayPokemon();
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
    exclusiveRarityEncounterFilteringCheckbox.addEventListener('change', () => {
        localStorage.setItem('exclusiveRarityEncounterFiltering', exclusiveRarityEncounterFilteringCheckbox.checked);
        displayPokemon();
    });

    excludeSafariCheckbox.addEventListener('change', () => {
        const filterConfig = {
            bestCatchingSpotsContainer: bestCatchingSpotsContainer,
            locationSearchTerm: catchingSpotSearchInput.value.toLowerCase(),
            pokemonSearchTerm: pokemonFilterInput.value.toLowerCase(),
            selectedRegions: Array.from(regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value.toLowerCase()),
            excludeSafariChecked: excludeSafariCheckbox.checked,
            prioritizeTimeExclusiveChecked: prioritizeTimeExclusiveCheckbox.checked
        };
        filterDisplayedCatchingSpots(filterConfig);
    });
    prioritizeTimeExclusiveCheckbox.addEventListener('change', () => {
        const selectedSortOption = sortCatchingSpotsDropdown.value;
        sortDisplayedCatchingSpots(bestCatchingSpotsContainer, prioritizeTimeExclusiveCheckbox.checked, selectedSortOption);
    });
    
    regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const filterConfig = {
                bestCatchingSpotsContainer: bestCatchingSpotsContainer,
                locationSearchTerm: catchingSpotSearchInput.value.toLowerCase(),
                pokemonSearchTerm: pokemonFilterInput.value.toLowerCase(),
                selectedRegions: Array.from(regionCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(checkbox => checkbox.value.toLowerCase()),
                excludeSafariChecked: excludeSafariCheckbox.checked,
                prioritizeTimeExclusiveChecked: prioritizeTimeExclusiveCheckbox.checked
            };
            filterDisplayedCatchingSpots(filterConfig);
        });
    });

    sortCatchingSpotsDropdown.addEventListener('change', () => {
        const selectedSortOption = sortCatchingSpotsDropdown.value;
        localStorage.setItem('sortCatchingSpots', selectedSortOption);
        sortDisplayedCatchingSpots(bestCatchingSpotsContainer, prioritizeTimeExclusiveCheckbox.checked, selectedSortOption);
    });

    pokedexGrid.dataset.listenersInitialized = 'true';
};

let lastKnownIngamePeriod = localStorage.getItem('lastKnownIngamePeriod');

const checkIngameTimeChange = () => {
    const { period: currentIngamePeriod } = getCurrentIngameTime();
    if (lastKnownIngamePeriod && lastKnownIngamePeriod !== currentIngamePeriod) {
        createMessageBox('info', null, 'The in-game daytime has changed. Refreshing the best catching spots list...');
        findBestCatchingSpots();
    }
    localStorage.setItem('lastKnownIngamePeriod', currentIngamePeriod);
    lastKnownIngamePeriod = currentIngamePeriod;
};


const applySelectedOptionColor = (selectElement) => {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (selectedOption && selectedOption.style.color) {
        selectElement.style.color = selectedOption.style.color;
    } else {
        selectElement.style.color = '';
    }
};

const updateIngameTimeDisplay = () => {
    const { formattedTime, period } = getCurrentIngameTime();
    const currentSeasonCode = getCurrentSeason();
    const currentSeasonName = getSeasonName(currentSeasonCode);
    const timeUntilNextPeriod = getTimeUntilNextPeriod();
    const ingameTimeSeasonElement = ingameTimeElement.querySelector('.ingame-time-season-top-left');
    const ingameTimeNextPeriodElement = ingameTimeElement.querySelector('.ingame-time-next-period');
    const ingameTimeMainElement = ingameTimeElement.querySelector('.ingame-time-main');

    if (ingameTimeSeasonElement) {
        ingameTimeSeasonElement.textContent = currentSeasonName;
    }
    if (ingameTimeNextPeriodElement) {
        ingameTimeNextPeriodElement.textContent = timeUntilNextPeriod;
    }
    if (ingameTimeMainElement) {
        ingameTimeMainElement.textContent = `${formattedTime} (${period})`;
    }
};

// leave it here for now, too tired.
let currentNotePopup = null;

const createNotePopupElement = (pokemon, notes, existingSprite) => {
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'note-popup-overlay';

    const popupContainer = document.createElement('div');
    popupContainer.className = 'note-popup-container';

    const popupHeader = document.createElement('div');
    popupHeader.className = 'note-popup-header';
    popupHeader.innerHTML = `
        <h2 class="note-popup-title">${pokemon.name} Notes</h2>
        <button class="note-popup-close-btn">&times;</button>
    `;
    popupContainer.appendChild(popupHeader);

    const popupContent = document.createElement('div');
    popupContent.className = 'pokemon-note-popup-content';

    const spriteContainer = document.createElement('div');
    spriteContainer.className = 'pokemon-note-popup-sprite-container';
    
    const spriteClone = existingSprite.cloneNode(true);
    spriteClone.classList.remove('small');
    spriteClone.classList.add('pokemon-note-popup-sprite');
    spriteContainer.appendChild(spriteClone);

    const pokemonNameElement = document.createElement('p');
    pokemonNameElement.className = 'pokemon-note-popup-name';
    pokemonNameElement.textContent = pokemon.name;
    spriteContainer.appendChild(pokemonNameElement);

    popupContent.appendChild(spriteContainer);

    const notesContainer = document.createElement('div');
    notesContainer.className = 'pokemon-note-popup-notes';
    notesContainer.innerHTML = notes.length > 0 
        ? notes.map(note => `<p class="pokemon-note-item ${note.type}">${note.text}</p>`).join('') 
        : ''; // Removed "No special notes for this Pokémon."
    popupContent.appendChild(notesContainer);

    popupContainer.appendChild(popupContent);
    popupOverlay.appendChild(popupContainer);

    popupHeader.querySelector('.note-popup-close-btn').addEventListener('click', () => {
        popupOverlay.remove();
        currentNotePopup = null;
    });

    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.remove();
            currentNotePopup = null;
        }
    });

    return popupOverlay;
};

const showPokemonNotesPopup = async (pokemonId, spriteElement) => {
    const pokemon = POKEMON.find(p => p.id == pokemonId);
    if (!pokemon) return;

    await updateEvolutionNotesInCache(pokemonId);
    const notes = pokemonNotesCache[pokemonId] || [];

    if (currentNotePopup) {
        currentNotePopup.remove();
    }

    const newPopup = createNotePopupElement(pokemon, notes, spriteElement);
    document.body.appendChild(newPopup);
    currentNotePopup = newPopup;
};

let pokemonNotesCache = {};

const initializePokemonNotes = async () => {
    pokemonNotesCache = {}; // Clear cache on reload
    // console.log('initializePokemonNotes: Starting note initialization. Current pokedexStatus:', pokedexStatus);
    for (const p of POKEMON) {
        pokemonNotesCache[p.id] = await getPokemonNotes(p.id, pokedexStatus);
    }
};

const updateEvolutionNotesInCache = async (changedPokemonId) => {
    for (const p of POKEMON) {
        const evolutionLineNames = getEvolutionLine(p.id);
        const isAffected = evolutionLineNames.some(name => {
            const evoPokemonObj = POKEMON.find(pk => pk.name.toLowerCase() === name.toLowerCase());
            return evoPokemonObj && evoPokemonObj.id == changedPokemonId;
        });

        if (isAffected) {
            pokemonNotesCache[p.id] = await getPokemonNotes(p.id, pokedexStatus);
        }
    }
};

function updatePokedexStatus(existingStatus) {
    const updatedStatus = {};
    POKEMON.forEach((p) => {
        if (existingStatus && existingStatus[p.id]) {
            updatedStatus[p.id] = existingStatus[p.id];
            if (updatedStatus[p.id].evolution_note === undefined) {
                updatedStatus[p.id].evolution_note = null;
            }
        } else {
            updatedStatus[p.id] = { id: p.id, name: p.name, caught: false, timestamp: null, evolution_note: null };
        }
    });

    return updatedStatus;
}
async function initializeApp() {
    try {
        await loadPokemonData();

        const currentPokedexStatus = getProfileData('pokedexStatus', null);
        pokedexStatus = updatePokedexStatus(currentPokedexStatus);
        saveProfileData('pokedexStatus', pokedexStatus);
        // console.log('initializeApp: pokedexStatus after update and save:', pokedexStatus);
        
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

        const savedExclusiveRarityEncounterFiltering = localStorage.getItem('exclusiveRarityEncounterFiltering');
        if (savedExclusiveRarityEncounterFiltering !== null) {
            exclusiveRarityEncounterFilteringCheckbox.checked = JSON.parse(savedExclusiveRarityEncounterFiltering);
        } else {
            exclusiveRarityEncounterFilteringCheckbox.checked = true; // Default to checked
        }

        populateFilters();
        
        const savedSortCatchingSpots = localStorage.getItem('sortCatchingSpots');
        if (savedSortCatchingSpots !== null) {
            sortCatchingSpotsDropdown.value = savedSortCatchingSpots;
        } else {
            sortCatchingSpotsDropdown.value = 'catchableCount'; // Default to "Catchable Species"
        }

        setupEventListeners();
        applySelectedOptionColor(filterSpecialElement);
        applySelectedOptionColor(filterDexStatusElement);
        applySelectedOptionColor(filterCanBeCaughtElement);
        applySelectedOptionColor(filterEncounterTriggerElement);
        await initializePokemonNotes();
        displayPokemon();
        updateIngameTimeDisplay();
        setInterval(updateIngameTimeDisplay, 1000);
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
