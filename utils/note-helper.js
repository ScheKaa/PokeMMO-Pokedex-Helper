import { POKEMON } from './pokemon.js';
import { getProfileData } from './profile-manager.js';
import { getEvolutionLine } from './dex-helper-utils.js';
import { isPokemonSafariExclusiveOnly } from './filter-helper.js';

export const getEvolutionMessages = (pokemonId) => {
    const uncatchableNames = [];
    const lureOnlyNames = [];
    const safariOnlyNames = [];
    const evolutionLineNames = getEvolutionLine(pokemonId);
    const pokedexStatus = getProfileData('pokedexStatus', {});
    const originalPokemon = POKEMON.find(p => p.id === pokemonId);

    if (!originalPokemon) {
        return [];
    }

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
            } else if (hasLureOnlyLocation && evoPokemonObj.id !== pokemonId) {
                //Exclude the original Pokémon from the lure-only note.
                lureOnlyNames.push(evoPokemonObj.name);
            }

            // Check for Safari Exclusive with non-Safari evolutions
            if (isPokemonSafariExclusiveOnly(evoPokemonObj) && evoPokemonObj.id !== pokemonId) {
                const hasNonSafariEvolution = Array.from(evolutionLineNames).some(name => {
                    const evolvedPokemon = POKEMON.find(pk => pk.name === name);
                    return evolvedPokemon && !isPokemonSafariExclusiveOnly(evolvedPokemon);
                });
                if (hasNonSafariEvolution) {
                    safariOnlyNames.push(evoPokemonObj.name);
                }
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
    if (safariOnlyNames.length > 0) {
        messages.push({ text: `Note: <span style="color: #ffd100;">${safariOnlyNames.join(', ')}</span> is Safari-only.`, type: 'safari-only' });
    }
    return messages;
};

export const getBetterSpotMessages = (pokemonId, currentRarity, pokemonLocations) => {
    const betterSpotMessages = [];
    const pokemonObj = POKEMON.find(p => p.id === pokemonId);

    if (!pokemonObj || !pokemonLocations) {
        return [];
    }

    const isOnlyLureOrVeryRare = pokemonLocations.every(loc => loc.rarity === "Lure" || loc.rarity === "Very Rare") && (pokemonLocations.includes("Lure") || pokemonLocations.includes("Very Rare"));

    if (isOnlyLureOrVeryRare) {
        pokemonLocations.forEach(loc => {
            if (!isSafariZoneLocation(loc.location) && (loc.rarity === "Lure" || loc.rarity === "Very Rare") && hasBetterEncounterSpot(pokemonId, loc.rarity)) {
                betterSpotMessages.push(`Note: A better encounter spot exists for ${pokemonObj.name}.`);
            }
        });
    }
    return [...new Set(betterSpotMessages)];
};