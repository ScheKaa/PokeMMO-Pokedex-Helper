import { POKEMON } from './pokemon.js';
import { ENCOUNTER_TRIGGERS } from './location.js';
import { getProfileData } from './profile-manager.js';

const safariZoneLocations = ['safari zone', 'great marsh'];

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

    return new Set([...visited].map(id => 
    POKEMON.find(p => p.id === id)?.name
    ).filter(Boolean));
}

export const getEvolutionMessages = (pokemonId) => {
    const uncatchableNames = [];
    const lureOnlyNames = [];
    const evolutionLineNames = getEvolutionLine(pokemonId);
    const pokedexStatus = getProfileData('pokedexStatus', {});

    for (const evoName of evolutionLineNames) {
        const evoPokemonObj = POKEMON.find(p => p.name.toLowerCase() === evoName.toLowerCase());
        if (evoPokemonObj) {
            const isCaught = pokedexStatus[evoPokemonObj.id]?.caught;
            if (isCaught) {
                continue;
            }
            const locations = evoPokemonObj.locations || [];
            const hasCatchableLocation = locations.some(loc => loc.rarity !== 'Uncatchable' && loc.rarity !== 'Unobtainable');
            const hasLureOnlyLocation = locations.every(loc => loc.rarity === 'Lure' || loc.rarity === 'Special');
            
            if (!hasCatchableLocation) {
                uncatchableNames.push(evoPokemonObj.name);
            } else if (hasLureOnlyLocation) {
                lureOnlyNames.push(evoPokemonObj.name);
            }
        }
    }

    let messages = [];
    if (uncatchableNames.length > 0) {
        messages.push({ text: `Consider keeping, <span style="color: #ffd100;">${uncatchableNames.join(', ')}</span> cannot be caught in the wild.`, type: 'uncatchable' });
    }
    if (lureOnlyNames.length > 0) {
        messages.push({ text: `Note: <span style="color: #ffd100;">${lureOnlyNames.join(', ')}</span> is Lure-only. Consider keeping for evolving/breeding.`, type: 'lure-only' });
    }
    return messages;
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

    const filteredByRegion = locations.filter(loc =>
        selectedRegions.includes(loc.region_name)
    );

    const nonSafariLocations = filteredByRegion.filter(loc => {
        const locationName = loc.location;
        const isSafariZone = locationName && safariZoneLocations.some(name => locationName.toLowerCase().includes(name));
        return !isSafariZone;
    });

    
    const allRegionalLocationsAreTimeExclusive = nonSafariLocations.every(loc => {
        const locationName = loc.location;
        const timeMatches = locationName.match(/(day|night|morning)/ig);
        return timeMatches && timeMatches.length > 0;
    });

    const filteredLocations = filteredByRegion.filter(loc => {
        const locationName = loc.location;
        const isSafariZone = locationName && safariZoneLocations.some(name => locationName.toLowerCase().includes(name));

        // Season check
        const seasonMatch = locationName.match(/season(\d)/i);
        const hasSeasonRequirement = !!seasonMatch;

        // Time of day check
        const timeMatches = locationName.match(/(day|night|morning)/ig);
        const hasTimeRequirement = timeMatches && timeMatches.length > 0;

        // Season check
        if (hasSeasonRequirement) {
            const requiredSeason = `SEASON${seasonMatch[1]}`;
            if (requiredSeason.toUpperCase() !== currentSeason.toUpperCase()) {
                return false;
            }
        }

        // Time of day check
        if (hasTimeRequirement) {
            const allowedTimes = timeMatches.map(t => t.toLowerCase());
            if (!allowedTimes.includes(currentTimeOfDay.toLowerCase())) {
                return false;
            }
            loc.timeExclusivity = timeMatches.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('/');
        }
        
        loc.timeExclusivityOnly = !isSafariZone && hasTimeRequirement && allRegionalLocationsAreTimeExclusive;
        return true;
    });

    // Sort by rarity
    return filteredLocations.sort((a, b) => {
        const rarityA = rarityOrder[a.rarity] || 99;
        const rarityB = rarityOrder[b.rarity] || 99;
        return rarityA - rarityB;
    });
};
