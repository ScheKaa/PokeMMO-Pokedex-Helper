import { POKEMON, getPokeDexID } from './pokemon.js';
import { REGIONS, ENCOUNTER_TRIGGERS, ENCOUNTER_TYPE } from './location.js';
import { isSafariZoneLocation } from './filter-helper.js';
import { filterLocationsByTimeAndSeason, getEvolutionLine } from './dex-helper-utils.js';
import { isPokemonTimeExclusiveOnly } from './filter-helper.js';

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

export const sortDisplayedCatchingSpots = (bestCatchingSpotsContainer, prioritizeTimeExclusiveChecked, sortingOption) => {
    const detailsElements = Array.from(bestCatchingSpotsContainer.querySelectorAll('details'));

    // Sort the elements
    detailsElements.sort((a, b) => {
        const aLocationHeader = a.querySelector('.location-header');
        const bLocationHeader = b.querySelector('.location-header');

        const aEvolutionLineCount = parseInt(aLocationHeader?.textContent.match(/\((\d+) Species Lines/)?.[1] || 0);
        const bEvolutionLineCount = parseInt(bLocationHeader?.textContent.match(/\((\d+) Species Lines/)?.[1] || 0);

        const aCatchableCount = parseInt(aLocationHeader?.textContent.match(/(\d+) Catchable Species/)?.[1] || 0);
        const bCatchableCount = parseInt(bLocationHeader?.textContent.match(/(\d+) Catchable Species/)?.[1] || 0);

        const aTotalUncaughtInEvolutionLines = parseInt(aLocationHeader?.textContent.match(/(\d+) Dex Entries/)?.[1] || 0);
        const bTotalUncaughtInEvolutionLines = parseInt(bLocationHeader?.textContent.match(/(\d+) Dex Entries/)?.[1] || 0);

        const aHasTimeExclusivePokemon = aLocationHeader?.querySelector('.summary-details-text')?.style.color === 'rgb(154, 230, 180)';
        const bHasTimeExclusivePokemon = bLocationHeader?.querySelector('.summary-details-text')?.style.color === 'rgb(154, 230, 180)';

        if (prioritizeTimeExclusiveChecked) {
            if (aHasTimeExclusivePokemon && !bHasTimeExclusivePokemon) {
                return -1;
            }
            if (!aHasTimeExclusivePokemon && bHasTimeExclusivePokemon) {
                return 1;
            }
        }

        let primarySort = 0;
        if (sortingOption === 'evolutionLineCount') {
            primarySort = bEvolutionLineCount - aEvolutionLineCount;
        } else if (sortingOption === 'catchableCount') {
            primarySort = bCatchableCount - aCatchableCount;
        } else if (sortingOption === 'totalUncaughtInEvolutionLines') {
            primarySort = bTotalUncaughtInEvolutionLines - aTotalUncaughtInEvolutionLines;
        }

        if (primarySort !== 0) {
            return primarySort;
        }
        if (!prioritizeTimeExclusiveChecked) {
            if (aHasTimeExclusivePokemon && !bHasTimeExclusivePokemon) {
                return 1;
            }
            if (!aHasTimeExclusivePokemon && bHasTimeExclusivePokemon) {
                return -1;
            }
        }

        return bTotalUncaughtInEvolutionLines - aTotalUncaughtInEvolutionLines;
    });

    detailsElements.forEach(detail => bestCatchingSpotsContainer.appendChild(detail));
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

    bestCatchingSpotsContainer.querySelectorAll('details').forEach(detail => {
        const fullLocationHeader = detail.querySelector('.location-header').textContent;
        const locationHeader = fullLocationHeader.split('(')[0].trim().toLowerCase();
        const pokemonEntries = detail.querySelectorAll('.location-pokemon-entry');
        let locationMatches = true;
        let pokemonMatches = false;

        const locationRegion = locationHeader.split(' - ')[0].trim();
        const regionMatches = selectedRegions.length === 0 || selectedRegions.includes(locationRegion);

        if (locationSearchTerm) {
            locationMatches = locationHeader.includes(locationSearchTerm);
        }

        if (pokemonSearchTerm) {
            pokemonEntries.forEach(entry => {
                const pokemonName = entry.dataset.pokemonName.toLowerCase();
                if (pokemonName.includes(pokemonSearchTerm)) {
                    pokemonMatches = true;
                }
            });
        } else {
            pokemonMatches = true;
        }

        if (locationMatches && pokemonMatches && regionMatches) {
            if (excludeSafariChecked && isSafariZoneLocation(locationHeader)) {
                detail.style.display = 'none';
            } else {
                detail.style.display = '';
            }
        } else {
            detail.style.display = 'none';
        }
    });
    sortDisplayedCatchingSpots(bestCatchingSpotsContainer, prioritizeTimeExclusiveChecked, sortingOption);
};
