import { POKEMON, getPokeDexID } from './pokemon.js';
import { getEvolutionLine, isLegendaryPokemon, areAllNonSafariLocationsTimeTagged } from './dex-helper-utils.js';
const LEGEND_AND_REQUIRED_IDS = [644]; // Zekrom

const safariZoneLocations = ['safari zone', 'great marsh', 'altering cave'];

const matchesSearchTerm = (p, searchTerm, regionFilter) => {
    if (!searchTerm) {
        return true;
    }
    const searchNum = parseInt(searchTerm, 10);
    if (!isNaN(searchNum)) {
        const idToCheck = regionFilter ? getPokeDexID(p.id, regionFilter) : p.id;
        if (idToCheck !== undefined && idToCheck !== 0 &&
            (idToCheck === searchNum || String(idToCheck).padStart(3, '0') === searchTerm)) {
            return true;
        }
    }
    return p.name.toLowerCase().includes(searchTerm);
};

const matchesRegionFilter = (p, regionFilter) => {
    if (!regionFilter) {
        return true;
    }
    const regionalIdForFilter = getPokeDexID(p.id, regionFilter);
    return regionalIdForFilter !== undefined && regionalIdForFilter !== 0;
};

const matchesTriggerFilter = (p, triggerFilter, exclusiveFilter) => {
    if (!triggerFilter) {
        return true;
    }
    if (!p.locations || p.locations.length === 0) {
        return false;
    }
    if (exclusiveFilter) {
        return p.locations.every((l) => l.rarity.toLowerCase() === triggerFilter.toLowerCase());
    } else {
        return p.locations.some((l) => l.rarity.toLowerCase() === triggerFilter.toLowerCase());
    }
};

const matchesTypeFilter = (p, typeFilter, exclusiveFilter) => {
    if (!typeFilter) {
        return true;
    }
    if (!p.locations || p.locations.length === 0) {
        return false;
    }
    if (exclusiveFilter) {
        return p.locations.every((l) => l.type.toLowerCase() === typeFilter.toLowerCase());
    } else {
        return p.locations.some((l) => l.type.toLowerCase() === typeFilter.toLowerCase());
    }
};

const matchesCaughtStatus = (p, caughtFilter, pokedexStatus) => {
    if (caughtFilter === "") {
        return true;
    } else if (caughtFilter === "Pheno Exclusive") {
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
        return allEvolutionsSpecialOnly;
    } else if (caughtFilter === "Legends") {
        return isLegendaryPokemon(p.id) || LEGEND_AND_REQUIRED_IDS.includes(p.id);
    } else if (caughtFilter === "Dex Required") {
        return !isLegendaryPokemon(p.id) || LEGEND_AND_REQUIRED_IDS.includes(p.id);
    } else if (caughtFilter === "Safari Exclusive") {
        return isPokemonSafariExclusiveOnly(p);
    } else if (caughtFilter === "Time Exclusive") {
        return isPokemonTimeExclusiveOnly(p);
    }
    return pokedexStatus[p.id]?.caught.toString() === caughtFilter;
};

const matchesCanBeCaughtStatus = (p, canBeCaughtFilter) => {
    if (canBeCaughtFilter === "") {
        return true;
    } else if (canBeCaughtFilter === "true") { // Corresponds to "Can Be Caught"
        return p.locations.length > 0;
    } else if (canBeCaughtFilter === "false") { // Corresponds to "Cannot Be Caught"
        return p.locations.length === 0;
    } else if (canBeCaughtFilter === "obtainable") {
        return p.obtainable === true;
    } else if (canBeCaughtFilter === "unobtainable") {
        return p.obtainable === false;
    }
    return true; // Should not reach here if all cases are handled
};

const matchesCaughtDateFilter = (p, caughtDateFilter, pokedexStatus) => {
    if (!caughtDateFilter) {
        return true;
    }
    const filterDate = new Date(caughtDateFilter);
    filterDate.setUTCHours(0, 0, 0, 0);
    const pokemonCaughtStatus = pokedexStatus[p.id];
    if (pokemonCaughtStatus?.caught && pokemonCaughtStatus?.timestamp) {
        const caughtDate = new Date(pokemonCaughtStatus.timestamp);
        caughtDate.setUTCHours(0, 0, 0, 0);
        return caughtDate.getTime() === filterDate.getTime();
    }
    return false;
};

export const getFilteredPokemon = (filterOptions, pokedexStatus) => {
    const { searchTerm, regionFilter, triggerFilter, typeFilter, caughtFilter, canBeCaughtFilter, caughtDateFilter, exclusiveFilter } = filterOptions;

    return POKEMON.filter((p) => {
        return matchesSearchTerm(p, searchTerm, regionFilter) &&
                matchesRegionFilter(p, regionFilter) &&
                matchesTriggerFilter(p, triggerFilter, exclusiveFilter) &&
                matchesTypeFilter(p, typeFilter, exclusiveFilter) &&
                matchesCaughtStatus(p, caughtFilter, pokedexStatus) &&
                matchesCanBeCaughtStatus(p, canBeCaughtFilter) &&
                matchesCaughtDateFilter(p, caughtDateFilter, pokedexStatus);
    });
};

const compareByCaughtDate = (a, b, sortCaughtDate, pokedexStatus) => {
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
    return 0;
};

const compareByRegionId = (a, b, regionFilter) => {
    const aRegionalId = getPokeDexID(a.id, regionFilter);
    const bRegionalId = getPokeDexID(b.id, regionFilter);
    const aSortValue = (aRegionalId !== undefined && aRegionalId !== 0) ? aRegionalId : 1000000 + a.id;
    const bSortValue = (bRegionalId !== undefined && bRegionalId !== 0) ? bRegionalId : 1000000 + b.id;
    return aSortValue - bSortValue;
};

export const getSortedPokemon = (pokemonList, sortOptions, pokedexStatus) => {
    const { sortCaughtDate, regionFilter } = sortOptions;

    return [...pokemonList].sort((a, b) => {
        if (sortCaughtDate !== "") {
            const caughtDateComparison = compareByCaughtDate(a, b, sortCaughtDate, pokedexStatus);
            if (caughtDateComparison !== 0) {
                return caughtDateComparison;
            }
        }

        if (regionFilter) {
            return compareByRegionId(a, b, regionFilter);
        } else {
            return a.id - b.id;
        }
    });
};

export const isLocationInSelectedRegions = (loc, selectedRegions) => {
    return selectedRegions.includes(loc.region_name);
};

export const isSafariZoneLocation = (locationName) => {
    return locationName && safariZoneLocations.some(name => locationName.toLowerCase().includes(name));
};

export const isPokemonSafariExclusiveOnly = (pokemon) => {
    if (!pokemon.locations || pokemon.locations.length === 0) {
        return false;
    }
    return pokemon.locations.every(loc => isSafariZoneLocation(loc.location));
};

export const matchesSeasonRequirement = (loc, currentSeason) => {
    const seasonMatch = loc.location.match(/season(\d)/i);
    const hasSeasonRequirement = !!seasonMatch;
    if (hasSeasonRequirement) {
        const requiredSeason = `SEASON${seasonMatch[1]}`;
        return requiredSeason.toUpperCase() === currentSeason.toUpperCase();
    }
    return true;
};

export const matchesTimeRequirement = (loc, currentTimeOfDay) => {
    const timeMatches = loc.location.match(/(day|night|morning)/ig);
    const hasTimeRequirement = timeMatches && timeMatches.length > 0;
    if (hasTimeRequirement) {
        const allowedTimes = timeMatches.map(t => t.toLowerCase());
        loc.timeExclusivity = timeMatches.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('/');
        return allowedTimes.includes(currentTimeOfDay.toLowerCase());
    }
    return true;
};

export const areAllRegionalLocationsTimeExclusive = (locations) => {
    const nonSafariLocations = locations.filter(loc => !isSafariZoneLocation(loc.location));
    return nonSafariLocations.every(loc => {
        const timeMatches = loc.location.match(/(day|night|morning)/ig);
        return timeMatches && timeMatches.length > 0;
    });
};

export const filterLocationsByPokemon = (locations, pokemonNameFilter) => {
    if (!pokemonNameFilter) {
        return locations;
    }
    const lowerCaseFilter = pokemonNameFilter.toLowerCase();
    return locations.filter(loc => {
        return loc.pokemon.some(p => p.name.toLowerCase().includes(lowerCaseFilter));
    });
};

export const isPokemonTimeExclusiveOnly = (pokemon) => {
    if (!pokemon.locations || pokemon.locations.length === 0) {
        return false;
    }
    return areAllNonSafariLocationsTimeTagged(pokemon.locations);
};
