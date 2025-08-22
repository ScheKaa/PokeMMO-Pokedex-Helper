import { POKEMON } from './pokemon.js';
import { ENCOUNTER_TRIGGERS } from './location.js';
import { isLocationInSelectedRegions, isSafariZoneLocation, matchesSeasonRequirement, matchesTimeRequirement } from './filter-helper.js';
const NOT_LEGENDARY_IDS = [142]; // Aerodactyl
const notAllowedToUse = ["mt. silver"];
/**
 * @returns {string} The current season in the format 'SEASONX'.
 */
export const getCurrentSeason = () => {
    // Get the current month (0-11)
    const currentMonth = new Date().getMonth();

    // Map the month to the correct season number (0-3)
    let season;
    if ([0, 4, 8].includes(currentMonth)) {
        // January, May, September
        season = 0; // Spring
    } else if ([1, 5, 9].includes(currentMonth)) {
        // February, June, October
        season = 1; // Summer
    } else if ([2, 6, 10].includes(currentMonth)) {
        // March, July, November
        season = 2; // Autumn
    } else {
        // April, August, December
        season = 3; // Winter
    }

    return `SEASON${season}`;
};

export const getSeasonName = (seasonCode) => {
    switch (seasonCode) {
        case 'SEASON0': return 'Spring';
        case 'SEASON1': return 'Summer';
        case 'SEASON2': return 'Autumn';
        case 'SEASON3': return 'Winter';
        default: return seasonCode;
    }
};

export function getEvolutionLine(pokemonId) {
    const visited = new Set();
    const queue = [pokemonId];
    while (queue.length) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        
        const species = POKEMON.find(p => p.id === currentId);
        if (!species) continue;
        
        visited.add(currentId);
        
        [
            ...(species.evolutions || []).map(e => e.id),
            ...POKEMON
                .filter(p => p.evolutions?.some(e => e.id === currentId))
                .map(p => p.id)
        ].forEach(id => !visited.has(id) && queue.push(id));
    }

    const evolutionLineNames = [...new Set([...visited].map(id => 
        POKEMON.find(p => p.id === id)?.name
    ).filter(Boolean))];
    // returns: Evolution line for Pokemon ID 634: (3) ['Zweilous', 'Hydreigon', 'Deino']
    // console.log(`Evolution line for Pokemon ID ${pokemonId}:`, evolutionLineNames);

    return evolutionLineNames;
}

export function getUncaughtEvolutionLineCount(pokemonId, pokedexStatus) {
    const evolutionLineNames = getEvolutionLine(pokemonId);
    const uncaughtEvolutionPokemon = evolutionLineNames.filter(evoName => {
        const evoPokemon = POKEMON.find(pk => pk.name === evoName);
        return evoPokemon && !pokedexStatus[evoPokemon.id]?.caught;
    });
    return uncaughtEvolutionPokemon.length;
}

const evolutionOrderCache = new Map();

/**
 * @param {number} id The ID of the Pokémon.
 * @returns {number} The evolutionary order of the Pokémon (0 for base form, 1 for first evolution, etc.).
 */
function getEvolutionOrder(id) {
    // Check if the order is already in the cache to prevent redundant calculations.
    if (evolutionOrderCache.has(id)) {
        return evolutionOrderCache.get(id);
    }
    
    const prevEvolution = POKEMON.find(p => p.evolutions?.some(e => e.id === id));
    
    // If no previous evolution is found, this is the base form (order 0).
    if (!prevEvolution) {
        evolutionOrderCache.set(id, 0);
        return 0;
    }
    
    const parentOrder = getEvolutionOrder(prevEvolution.id);
    const order = parentOrder + 1;
    
    // Store the result in the cache before returning.
    evolutionOrderCache.set(id, order);
    return order;
}

/**
 * @param {number} pokemonId The ID of the starting Pokémon.
 * @returns {Array<Object>} An array of Pokémon objects belonging to the same evolution line,
 * with only the 'id', 'name', 'evolutions', and 'order' properties.
 */
export function getEvolutionLineDetails(pokemonId) {
    const visited = new Set();
    const queue = [pokemonId];
    const pokemonObjects = new Map();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        
        const species = POKEMON.find(p => p.id === currentId);
        if (!species) continue;
        
        visited.add(currentId);

        const order = getEvolutionOrder(currentId);
        
        const simplifiedSpecies = {
            id: species.id,
            name: species.name,
            evolutions: species.evolutions,
            order: order
        };
        
        pokemonObjects.set(currentId, simplifiedSpecies);
        const evolutionIds = [
            ...(species.evolutions || []).map(e => e.id),
            ...POKEMON
                .filter(p => p.evolutions?.some(e => e.id === currentId))
                .map(p => p.id)
        ];
        evolutionIds.forEach(id => {
            if (!visited.has(id)) {
                queue.push(id);
            }
        });
    }
    return [...pokemonObjects.values()];
}

export const isLegendaryPokemon = (pokemonId) => {
    if (NOT_LEGENDARY_IDS.includes(pokemonId)) {
        return false;
    }

    const pokemon = POKEMON.find(p => p.id === pokemonId);
    if (!pokemon) return false;

    const hasCatchableLocation = pokemon.locations?.some(loc => loc.rarity !== 'Uncatchable' && loc.rarity !== 'Unobtainable');

    const evolutionLine = getEvolutionLine(pokemonId);
    const hasEvolutions = evolutionLine.length > 1;

    return !hasCatchableLocation && !hasEvolutions;
};

const rarityOrder = ENCOUNTER_TRIGGERS.reduce((acc, trigger) => {
    acc[trigger.name] = trigger.order;
    return acc;
}, {});

export const getRarityColor = (pokemonLocations) => {
    if (!pokemonLocations || pokemonLocations.length === 0) {
        return '#FFFFFF';
    }

    const specialOnly = pokemonLocations.every(loc => loc.rarity === 'Special');
    if (specialOnly) {
        return ENCOUNTER_TRIGGERS.find(t => t.name === 'Special')?.color || '#FFFFFF';
    }

    let lowestRarityOrder = Infinity;
    let lowestRarityName = '';

    for (const loc of pokemonLocations) {
        const trigger = ENCOUNTER_TRIGGERS.find(t => t.name === loc.rarity);
        if (trigger && trigger.order < lowestRarityOrder) {
            lowestRarityOrder = trigger.order;
            lowestRarityName = trigger.name;
        }
    }

    return ENCOUNTER_TRIGGERS.find(t => t.name === lowestRarityName)?.color || '#FFFFFF';
};

/**
 * @returns {{inGameHours: number, inGameMinutes: number, period: string, gameTotalSeconds: number}}
 */
const getIngameTimeDetails = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();

    const totalRealSecondsToday = (utcHours * 3600) + (utcMinutes * 60) + utcSeconds;
    const realSecondsInCycle = totalRealSecondsToday % 21600; // 6 real hours = 21600 real seconds

    const gameTotalSeconds = realSecondsInCycle * 4; // Convert real seconds to in-game seconds (4x speed)

    const inGameHours = Math.floor(gameTotalSeconds / 3600);
    const inGameMinutes = Math.floor((gameTotalSeconds % 3600) / 60);

    let period;
    if (inGameHours >= 4 && inGameHours < 11) {
        period = 'Morning';
    } else if (inGameHours >= 11 && inGameHours < 21) {
        period = 'Day';
    } else {
        period = 'Night';
    }

    return { inGameHours, inGameMinutes, period, gameTotalSeconds };
};

export const getCurrentIngameTime = () => {
    const { inGameHours, inGameMinutes, period } = getIngameTimeDetails();

    // Format the hours and minutes for display.
    const formattedHours = String(inGameHours).padStart(2, '0');
    const formattedMinutes = String(inGameMinutes).padStart(2, '0');
    const formattedTime = `${formattedHours}:${formattedMinutes}`;
    
    // console.log(`Current in-game time: ${formattedTime} - Period: ${period}`);
    return { period, formattedTime };
};

export const getTimeUntilNextPeriod = () => {
    const { inGameHours, gameTotalSeconds } = getIngameTimeDetails();

    let nextPeriodStartInGameHours;
    let nextPeriodName;

    if (inGameHours >= 4 && inGameHours < 11) { // Current period is Morning (4-10)
        nextPeriodStartInGameHours = 11; // Next is Day
        nextPeriodName = 'Day';
    } else if (inGameHours >= 11 && inGameHours < 21) { // Current period is Day (11-20)
        nextPeriodStartInGameHours = 21; // Next is Night
        nextPeriodName = 'Night';
    } else { // Current period is Night (21-3 or 0-3)
        nextPeriodStartInGameHours = 4; // Next is Morning
        nextPeriodName = 'Morning';
    }

    // Calculate in-game seconds until the next period starts
    let inGameSecondsUntilNextPeriod;
    if (nextPeriodStartInGameHours > inGameHours) {
        inGameSecondsUntilNextPeriod = (nextPeriodStartInGameHours * 3600) - gameTotalSeconds;
    } else {
        // If next period is in the next in-game day (e.g., Night to Morning)
        inGameSecondsUntilNextPeriod = (24 * 3600 - gameTotalSeconds) + (nextPeriodStartInGameHours * 3600);
    }

    // Convert in-game seconds back to real seconds (1/4 speed)
    const realSecondsRemaining = inGameSecondsUntilNextPeriod / 4;

    const hours = Math.floor(realSecondsRemaining / 3600);
    const minutes = Math.floor((realSecondsRemaining % 3600) / 60);
    const seconds = Math.floor(realSecondsRemaining % 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${nextPeriodName} in ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

export const areAllNonSafariLocationsTimeTagged = (locations) => {
    const nonSafariLocations = locations.filter(loc => !isSafariZoneLocation(loc.location));
    if (nonSafariLocations.length === 0) {
        return false;
    }
    return nonSafariLocations.every(loc => {
        const timeMatches = loc.location.match(/(day|night|morning)/ig);
        return timeMatches && timeMatches.length > 0;
    });
};

/**
 * Filters and sorts locations for a given Pokémon based on the current in-game time, season, and regional filters.
 * @param {object[]} locations The locations array from a pokemon object.
 * @param {string} currentSeason The current in-game season (e.g., 'SEASON0', 'SEASON1').
 * @param {string} currentTimeOfDay The current in-game time of day ('Day' or 'Night').
 * @param {string[]} selectedRegions The user's selected regions.
 * @returns {object[]} The filtered and sorted locations.
 */
export const filterLocationsByTimeAndSeason = (locations, selectedRegions) => {
    const currentSeason = getCurrentSeason();
    let { period: currentTimeOfDay } = getCurrentIngameTime();
    // For testing purposes
    // currentTimeOfDay = 'Morning';

    if (!selectedRegions || selectedRegions.length === 0) {
        return [];
    }
    // Bye Mt.Silver for now..
    const filteredLocationsByAllowed = locations.filter(loc => {
        return !notAllowedToUse.some(notAllowed => loc.location.toLowerCase().includes(notAllowed.toLowerCase()));
    });

    const filteredByRegion = filteredLocationsByAllowed.filter(loc =>
        isLocationInSelectedRegions(loc, selectedRegions)
    );

    const allRegionalLocationsAreTimeExclusive = areAllNonSafariLocationsTimeTagged(filteredByRegion);

    const filteredLocations = filteredByRegion.filter(loc => {
        const locationName = loc.location;
        const isSafari = isSafariZoneLocation(locationName);

        const seasonMatches = matchesSeasonRequirement(loc, currentSeason);
        const timeMatches = matchesTimeRequirement(loc, currentTimeOfDay);
        
        loc.timeExclusivityOnly = !isSafari && (loc.location.match(/(day|night|morning)/ig) && loc.location.match(/(day|night|morning)/ig).length > 0) && allRegionalLocationsAreTimeExclusive;
        
        return seasonMatches && timeMatches;
    });

    // Sort by rarity
    return filteredLocations.sort((a, b) => {
        const rarityA = rarityOrder[a.rarity] || 99;
        const rarityB = rarityOrder[b.rarity] || 99;
        return rarityA - rarityB;
    });
};
