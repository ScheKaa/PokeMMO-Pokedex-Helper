import { POKEMON } from './pokemon.js';
import { ENCOUNTER_TRIGGERS } from './location.js';
import { getProfileData } from './profile-manager.js';

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
        messages.push({ text: `Consider keeping, ${uncatchableNames.join(', ')} cannot be caught in the wild.`, type: 'uncatchable' });
    }
    if (lureOnlyNames.length > 0) {
        messages.push({ text: `Note: ${lureOnlyNames.join(', ')} is Lure-only. Consider keeping for evolving/breeding.`, type: 'lure-only' });
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
 * @returns {{period: string, formattedTime: string}}
 */
export const getCurrentIngameTime = () => {
    // Get the current time in UTC to ensure consistency regardless of the user's timezone.
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();

    const totalRealSecondsToday = (utcHours * 3600) + (utcMinutes * 60) + utcSeconds;
    
    // An in-game day is 6 real hours (6 * 60 * 60 = 21600 real seconds).
    const realSecondsInCycle = totalRealSecondsToday % 21600;

    // Convert real seconds in the cycle to in-game seconds (4x real time).
    const gameTotalSeconds = realSecondsInCycle * 4;

    // Convert total in-game seconds to hours and minutes.
    const inGameHours = Math.floor(gameTotalSeconds / 3600);
    const inGameMinutes = Math.floor((gameTotalSeconds % 3600) / 60);

    let period = (inGameHours >= 21 || inGameHours < 4) ? 'Night' : 'Day';

    // Format the hours and minutes for display.
    const formattedHours = String(inGameHours).padStart(2, '0');
    const formattedMinutes = String(inGameMinutes).padStart(2, '0');
    const formattedTime = `${formattedHours}:${formattedMinutes}`;
    
    //console.log(`Current in-game time: ${formattedTime} - Period: ${period}`);
    return { period, formattedTime };
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
    const { period: currentTimeOfDay } = getCurrentIngameTime();
    
    if (!selectedRegions || selectedRegions.length === 0) {
        return [];
    }
    
    const filteredByRegion = locations.filter(loc =>
        selectedRegions.includes(loc.region_name)
    );

    const filteredLocations = filteredByRegion.filter(loc => {
        const locationName = loc.location;
        
        // Season check
        const seasonMatch = locationName.match(/season(\d)/i);
        const hasSeasonRequirement = !!seasonMatch;

        // Time of day check
        const timeMatch = locationName.match(/(day|night|morning)/i);
        const hasTimeRequirement = !!timeMatch;

        // Season check
        if (hasSeasonRequirement) {
            const requiredSeason = `SEASON${seasonMatch[1]}`;
            if (requiredSeason.toUpperCase() !== currentSeason.toUpperCase()) {
                return false;
            }
        }

        // Time of day check
        if (hasTimeRequirement) {
            const requiredTime = timeMatch[1];
            if (requiredTime.toLowerCase() === 'night' && currentTimeOfDay.toLowerCase() !== 'night') {
                return false;
            }
            if ((requiredTime.toLowerCase() === 'day' || requiredTime.toLowerCase() === 'morning') && currentTimeOfDay.toLowerCase() !== 'day') {
                return false;
            }
        }
        return true;
    });

    // Sort by rarity
    return filteredLocations.sort((a, b) => {
        const rarityA = rarityOrder[a.rarity] || 99;
        const rarityB = rarityOrder[b.rarity] || 99;
        return rarityA - rarityB;
    });
};
