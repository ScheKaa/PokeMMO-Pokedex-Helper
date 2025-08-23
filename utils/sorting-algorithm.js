import { POKEMON, getPokeDexID } from './pokemon.js';
import { REGIONS, ENCOUNTER_TRIGGERS, ENCOUNTER_TYPE } from './location.js';
import { isSafariZoneLocation } from './filter-helper.js';
import { filterLocationsByTimeAndSeason, getEvolutionLine } from './dex-helper-utils.js';
import { isPokemonTimeExclusiveOnly } from './filter-helper.js';

let cachedCatchingSpotsData = [];

export const initializeCatchingSpotData = (bestCatchingSpotsContainer) => {
    const detailsElements = Array.from(bestCatchingSpotsContainer.querySelectorAll('details'));
    cachedCatchingSpotsData = detailsElements.map(detail => {
        const locationHeaderElement = detail.querySelector('.location-header');
        const fullLocationHeader = locationHeaderElement?.textContent || '';
        const locationHeader = fullLocationHeader.split('(')[0].trim().toLowerCase();
        const pokemonEntries = Array.from(detail.querySelectorAll('.location-pokemon-entry'));

        return {
            domElement: detail,
            fullLocationHeader: fullLocationHeader,
            parsedLocationHeader: locationHeader,
            evolutionLineCount: parseInt(fullLocationHeader.match(/\((\d+) Species Lines/)?.[1] || 0),
            catchableCount: parseInt(fullLocationHeader.match(/(\d+) Catchable Species/)?.[1] || 0),
            totalUncaughtInEvolutionLines: parseInt(fullLocationHeader.match(/(\d+) Dex Entries/)?.[1] || 0),
            hasTimeExclusivePokemon: locationHeaderElement?.querySelector('.summary-details-text')?.style.color === 'rgb(154, 230, 180)',
            pokemonNames: pokemonEntries.map(entry => entry.dataset.pokemonName.toLowerCase()),
            locationRegion: locationHeader.split(' - ')[0].trim(),
            isSafariZone: isSafariZoneLocation(locationHeader)
        };
    });
};

export const hasBetterEncounterSpot = (pokemonId, currentRarity) => {
    const pokemonObj = POKEMON.find(p => p.id === pokemonId);
    if (!pokemonObj || !pokemonObj.locations) {
        return false;
    }

    const nonSafariLocations = pokemonObj.locations.filter(loc => !isSafariZoneLocation(loc.location));

    if (currentRarity === "Lure") {
        return nonSafariLocations.some(loc =>
            loc.rarity && loc.rarity !== "Special" && loc.rarity !== "Lure"
        );
    }

    if (currentRarity === "Very Rare") {
        return nonSafariLocations.some(loc =>
            loc.rarity && loc.rarity !== "Special" && loc.rarity !== "Lure" && loc.rarity !== "Very Rare"
        );
    }

    return false;
};

export const groupPokemonByLocation = (config) => {
    const { pokedexStatus, displayMoreInfoChecked } = config;
    const locations = new Map();
    const allRegions = REGIONS.map(region => region.charAt(0).toUpperCase() + region.slice(1));

    POKEMON.forEach(pokemon => {
        if (pokemon.locations) {
            let filteredLocations = filterLocationsByTimeAndSeason(pokemon.locations, allRegions);
            
            filteredLocations.forEach(loc => {
                if (loc.rarity === "Special") return;

                const cleanLocationName = loc.location.replace(/\s*\((season[0-3]|day|night|morning)[^)]*\)/gi, '').trim();
                const locationKey = `${loc.region_name} - ${cleanLocationName}`;

                if (!locations.has(locationKey)) {
                    locations.set(locationKey, { 
                        pokemonMap: new Map(), 
                        uncaughtTriggerCounts: {}, 
                        uncaughtTypeCounts: {},
                        countedUncaughtPokemonForRarity: new Map(), 
                        countedUncaughtPokemonForType: new Map(),
                        countedEvolutionLines: new Set()
                    });
                }
                const locationData = locations.get(locationKey);
                const pokemonInLocationMap = locationData.pokemonMap;

                if (!pokemonInLocationMap.has(pokemon.id)) {
                    pokemonInLocationMap.set(pokemon.id, { ...pokemon, encounters: [] });
                }
                pokemonInLocationMap.get(pokemon.id).encounters.push(loc);

                if (!displayMoreInfoChecked && !pokedexStatus[pokemon.id]?.caught) {
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

export const sortLocationPokemon = (pokemonList, currentRegionFilter) => {
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

export const sortRelevantLocations = (relevantLocations) => {
    relevantLocations.sort((a, b) => {
        if (b.evolutionLineCount !== a.evolutionLineCount) {
            return b.evolutionLineCount - a.evolutionLineCount;
        }
        return b.totalUncaughtInEvolutionLines - a.totalUncaughtInEvolutionLines;
    });
};

export const sortDisplayedCatchingSpots = (filteredSpots, prioritizeTimeExclusiveChecked, sortingOption) => {
    // Sort the elements
    filteredSpots.sort((a, b) => {
        if (prioritizeTimeExclusiveChecked) {
            if (a.hasTimeExclusivePokemon && !b.hasTimeExclusivePokemon) {
                return -1;
            }
            if (!a.hasTimeExclusivePokemon && b.hasTimeExclusivePokemon) {
                return 1;
            }
        }

        let primarySort = 0;
        if (sortingOption === 'evolutionLineCount') {
            primarySort = b.evolutionLineCount - a.evolutionLineCount;
        } else if (sortingOption === 'catchableCount') {
            primarySort = b.catchableCount - a.catchableCount;
        } else if (sortingOption === 'totalUncaughtInEvolutionLines') {
            primarySort = b.totalUncaughtInEvolutionLines - a.totalUncaughtInEvolutionLines;
        }

        if (primarySort !== 0) {
            return primarySort;
        }
        if (!prioritizeTimeExclusiveChecked) {
            if (a.hasTimeExclusivePokemon && !b.hasTimeExclusivePokemon) {
                return 1;
            }
            if (!a.hasTimeExclusivePokemon && b.hasTimeExclusivePokemon) {
                return -1;
            }
        }

        return b.totalUncaughtInEvolutionLines - a.totalUncaughtInEvolutionLines;
    });

    return filteredSpots.map(spot => spot.domElement);
};


export const filterDisplayedCatchingSpots = (config) => {
    const {
        bestCatchingSpotsContainer,
        locationSearchTerm,
        pokemonSearchTerm,
        selectedRegions,
        excludeSafariChecked,
        prioritizeTimeExclusiveChecked,
        sortingOption
    } = config;

    const lowerCaseLocationSearchTerm = locationSearchTerm ? locationSearchTerm.toLowerCase() : '';
    const lowerCasePokemonSearchTerm = pokemonSearchTerm ? pokemonSearchTerm.toLowerCase() : '';

    let filteredAndVisibleSpots = [];

    cachedCatchingSpotsData.forEach(spot => {
        let locationMatches = true;
        let pokemonMatches = false;

        const regionMatches = selectedRegions.length === 0 || selectedRegions.includes(spot.locationRegion);

        if (lowerCaseLocationSearchTerm) {
            locationMatches = spot.parsedLocationHeader.includes(lowerCaseLocationSearchTerm);
        }

        if (lowerCasePokemonSearchTerm) {
            pokemonMatches = spot.pokemonNames.some(name => name.includes(lowerCasePokemonSearchTerm));
        } else {
            pokemonMatches = true;
        }

        if (locationMatches && pokemonMatches && regionMatches) {
            if (excludeSafariChecked && spot.isSafariZone) {
                spot.domElement.style.display = 'none';
            } else {
                spot.domElement.style.display = '';
                filteredAndVisibleSpots.push(spot);
            }
        } else {
            spot.domElement.style.display = 'none';
        }
    });

    const sortedElements = sortDisplayedCatchingSpots(filteredAndVisibleSpots, prioritizeTimeExclusiveChecked, sortingOption);
    sortedElements.forEach(detail => bestCatchingSpotsContainer.appendChild(detail));
};
